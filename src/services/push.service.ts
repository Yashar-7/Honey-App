import webpush from "web-push";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:soporte@honey-app.local";

  if (!publicKey || !privateKey) {
    throw new AppError(
      503,
      "Web Push no configurado (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!key) {
    throw new AppError(503, "VAPID_PUBLIC_KEY no configurada");
  }
  return key;
}

export type SubscribePushInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

export async function savePushSubscription(
  userId: string,
  input: SubscribePushInput,
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

function isExpiredSubscription(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { statusCode?: number }).statusCode;
  return status === 404 || status === 410;
}

/** Envía a todos los navegadores registrados del dueño. No lanza si falla un dispositivo. */
export async function notifyPetOwner(userId: string, payload: WebPushPayload) {
  try {
    ensureVapid();
  } catch {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return { sent: 0, failed: 0 };

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "honey-app",
    data: payload.data ?? {},
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification,
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        if (isExpiredSubscription(err)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }),
  );

  return { sent, failed };
}
