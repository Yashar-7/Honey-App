import { Prisma } from "@prisma/client";
import { formatLocationReference } from "../lib/geocoding";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  CreateMessageInput,
  MESSAGE_SENDER,
  ReplyMessageInput,
} from "../schemas/message.schema";
import { broadcastChatSessionUpdate } from "./realtime.service";
import { notifyOwnerOfPetEvent } from "./ownerNotify.service";
import { awardReturnReputation, getRescuerReputation } from "./rescuer.service";

const MESSAGE_SELECT = {
  id: true,
  sessionId: true,
  sender: true,
  text: true,
  locationReference: true,
  imageUrl: true,
  createdAt: true,
} as const satisfies Prisma.MessageSelect;

const SESSION_WITH_PET_SELECT = {
  id: true,
  status: true,
  expiresAt: true,
  returnedAt: true,
  visitorFingerprint: true,
  pet: {
    select: {
      id: true,
      name: true,
      userId: true,
      isActive: true,
      isLost: true,
      lastLat: true,
      lastLng: true,
      user: {
        select: { name: true },
      },
    },
  },
} as const satisfies Prisma.ContactSessionSelect;

const SESSION_RETURN_SELECT = {
  id: true,
  status: true,
  expiresAt: true,
  returnedAt: true,
  visitorFingerprint: true,
  pet: {
    select: {
      id: true,
      name: true,
      userId: true,
      isLost: true,
    },
  },
} as const satisfies Prisma.ContactSessionSelect;

type SessionWithPet = Prisma.ContactSessionGetPayload<{
  select: typeof SESSION_WITH_PET_SELECT;
}>;

function buildChatNotifyBody(message: {
  text: string | null;
  locationReference: string | null;
  imageUrl: string | null;
}): string {
  const parts: string[] = [];
  if (message.text) parts.push(message.text);
  if (message.locationReference) {
    parts.push(message.locationReference.replace(/^📍\s*/, "Ubicación: "));
  }
  if (message.imageUrl) parts.push("Foto adjunta");
  return parts.join(" · ") || "Nuevo mensaje de un vecino";
}

async function publishChatUpdate(
  sessionId: string,
  message: {
    id: string;
    sender: string;
    createdAt: Date;
  },
) {
  void broadcastChatSessionUpdate(sessionId, {
    type: "new_message",
    messageId: message.id,
    sender: message.sender,
    createdAt: message.createdAt.toISOString(),
  });
}

export function getChatSessionRealtimeConfig(sessionId: string) {
  return {
    channel: `chat-session:${sessionId}`,
    event: "chat_update",
  };
}

/** Registra ubicación legible en el chat (sin duplicar push GPS). */
export async function appendLocationReferenceMessage(
  sessionId: string,
  addressLabel: string,
) {
  const session = await prisma.contactSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      pet: {
        select: { id: true, isActive: true },
      },
    },
  });

  if (
    !session ||
    session.status !== "open" ||
    session.expiresAt <= new Date() ||
    !session.pet.isActive
  ) {
    return null;
  }

  const locationReference = formatLocationReference(addressLabel);

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      sender: MESSAGE_SENDER.FINDER,
      locationReference,
    },
    select: MESSAGE_SELECT,
  });

  void publishChatUpdate(session.id, message);
  return message;
}

async function getReadableSession(sessionId: string): Promise<SessionWithPet> {
  const session = await prisma.contactSession.findUnique({
    where: { id: sessionId },
    select: SESSION_WITH_PET_SELECT,
  });

  if (!session) {
    throw new AppError(404, "Sesión de contacto no encontrada");
  }

  if (session.status !== "open") {
    throw new AppError(410, "Esta sesión de contacto fue cerrada");
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError(410, "Esta sesión de contacto expiró");
  }

  if (!session.pet.isActive) {
    throw new AppError(410, "La mascota asociada ya no está activa");
  }

  return session;
}

export async function getSessionMessages(sessionId: string) {
  const session = await getReadableSession(sessionId);

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: MESSAGE_SELECT,
  });

  const finderBadge = await getRescuerReputation(session.visitorFingerprint);

  return {
    sessionId,
    messages,
    finder: {
      reputationScore: finderBadge.score,
      badgeLabel: finderBadge.label,
      badgeLevel: finderBadge.level,
    },
    pet: {
      id: session.pet.id,
      name: session.pet.name,
      isLost: session.pet.isLost,
      lastLat: session.pet.lastLat,
      lastLng: session.pet.lastLng,
    },
    returnedAt: session.returnedAt,
  };
}

export async function sendSessionMessage(
  sessionId: string,
  input: CreateMessageInput,
) {
  const session = await getReadableSession(sessionId);

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      sender: MESSAGE_SENDER.FINDER,
      text: input.text ?? null,
      locationReference: input.locationReference ?? null,
      imageUrl: input.imageUrl ?? null,
    },
    select: MESSAGE_SELECT,
  });

  void notifyOwnerOfPetEvent(session.pet.userId, {
    type: "chat_message",
    petId: session.pet.id,
    sessionId: session.id,
    petName: session.pet.name,
    body: buildChatNotifyBody(message),
    autoOpenChat: true,
    ...(message.locationReference
      ? {
          addressLabel: message.locationReference.replace(/^📍\s*/, ""),
        }
      : {}),
  });

  void publishChatUpdate(session.id, message);

  return {
    success: true,
    message: "Mensaje enviado al dueño correctamente",
    data: message,
  };
}

export async function replySessionMessage(
  sessionId: string,
  userId: string,
  input: ReplyMessageInput,
) {
  const session = await getReadableSession(sessionId);

  if (session.pet.userId !== userId) {
    throw new AppError(403, "No tenés permiso para responder en esta sesión");
  }

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      sender: MESSAGE_SENDER.OWNER,
      text: input.text,
    },
    select: MESSAGE_SELECT,
  });

  void publishChatUpdate(session.id, message);

  return {
    message: "Respuesta enviada al vecino correctamente",
    data: message,
  };
}

export async function markPetAsReturned(sessionId: string) {
  const session = await prisma.contactSession.findUnique({
    where: { id: sessionId },
    select: SESSION_RETURN_SELECT,
  });

  if (!session) {
    throw new AppError(404, "Sesión de contacto no encontrada");
  }

  if (session.returnedAt) {
    const badge = await getRescuerReputation(session.visitorFingerprint);
    return {
      success: true,
      alreadyReturned: true,
      message: "Esta mascota ya fue marcada como devuelta",
      finder: badge,
    };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.contactSession.update({
      where: { id: session.id },
      data: {
        returnedAt: now,
        status: "closed",
      },
    });

    await tx.pet.update({
      where: { id: session.pet.id },
      data: { isLost: false },
    });
  });

  const finderBadge = await awardReturnReputation(session.visitorFingerprint);

  void notifyOwnerOfPetEvent(session.pet.userId, {
    type: "pet_returned",
    petId: session.pet.id,
    sessionId: session.id,
    petName: session.pet.name,
    body: `Un vecino marcó a ${session.pet.name} como devuelta/a 🎉`,
  });

  return {
    success: true,
    message: "¡Gracias por ayudar! Sumaste reputación de rescatista.",
    finder: finderBadge,
    returnedAt: now.toISOString(),
  };
}

/** Dueño marca el caso como resuelto: cierra sesión y desactiva modo alerta. */
export async function resolveCaseByOwner(sessionId: string, userId: string) {
  const session = await prisma.contactSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      pet: {
        select: {
          id: true,
          name: true,
          userId: true,
          isLost: true,
        },
      },
    },
  });

  if (!session) {
    throw new AppError(404, "Sesión de contacto no encontrada");
  }

  if (session.pet.userId !== userId) {
    throw new AppError(403, "No tenés permiso para cerrar este caso");
  }

  if (session.status === "closed") {
    return {
      success: true,
      alreadyResolved: true,
      message: "Este caso ya estaba marcado como resuelto",
      petId: session.pet.id,
      petName: session.pet.name,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.contactSession.update({
      where: { id: session.id },
      data: { status: "closed" },
    });

    if (session.pet.isLost) {
      await tx.pet.update({
        where: { id: session.pet.id },
        data: { isLost: false },
      });
    }
  });

  void notifyOwnerOfPetEvent(userId, {
    type: "case_resolved",
    petId: session.pet.id,
    sessionId: session.id,
    petName: session.pet.name,
    body: `Caso de ${session.pet.name} marcado como resuelto.`,
  });

  return {
    success: true,
    message: `Caso de ${session.pet.name} marcado como resuelto`,
    petId: session.pet.id,
    petName: session.pet.name,
  };
}
