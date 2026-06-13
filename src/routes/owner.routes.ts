import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth.middleware";
import { getOwnerWarRoom } from "../services/ownerDashboard.service";
import { togglePetLostAlert } from "../services/pet.service";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "../services/push.service";
import {
  subscribePushSchema,
  unsubscribePushSchema,
} from "../schemas/push.schema";
import { AuthenticatedRequest } from "../types/express";

export const ownerRouter = Router();

/**
 * GET /api/owner/war-room
 * Feed en tiempo real para el dashboard del dueño (polling).
 * Query opcional: ?since=ISO8601 — solo reportes nuevos desde ese instante.
 */
ownerRouter.get("/war-room", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const sinceRaw = req.query.since;

    let since: Date | undefined;
    if (typeof sinceRaw === "string" && sinceRaw.trim()) {
      const parsed = new Date(sinceRaw);
      if (!Number.isNaN(parsed.getTime())) {
        since = parsed;
      }
    }

    const result = await getOwnerWarRoom(userId, since);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/owner/pets/:petId/toggle-alert
 * Alterna isLost (Modo Alerta) en Neon. Alias conceptual: toggle-lost.
 */
ownerRouter.post(
  "/pets/:petId/toggle-alert",
  requireAuth,
  async (req, res, next) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const petId = String(req.params.petId);
      const result = await togglePetLostAlert(petId, userId);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/owner/push/vapid-public-key
 * Clave pública VAPID para que el dashboard suscriba PushManager.
 */
ownerRouter.get("/push/vapid-public-key", (_req, res, next) => {
  try {
    res.json({ publicKey: getVapidPublicKey() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/owner/push/subscribe
 * Registra o actualiza la suscripción Web Push del navegador del dueño.
 */
ownerRouter.post("/push/subscribe", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const input = subscribePushSchema.parse(req.body);
    const subscription = await savePushSubscription(userId, {
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: req.get("user-agent") ?? undefined,
    });
    res.status(201).json({ success: true, id: subscription.id });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/owner/push/subscribe
 * Elimina la suscripción Web Push del dueño (logout o revocar permisos).
 */
ownerRouter.delete("/push/subscribe", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { endpoint } = unsubscribePushSchema.parse(req.body);
    await removePushSubscription(userId, endpoint);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/owner/realtime-config
 * Credenciales de Supabase Realtime para el canal war-room del dueño autenticado.
 */
ownerRouter.get("/realtime-config", requireAuth, (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new AppError(
        503,
        "Realtime no configurado (SUPABASE_URL / SUPABASE_ANON_KEY)",
      );
    }

    res.json({
      supabaseUrl,
      supabaseAnonKey,
      channel: `war-room:${userId}`,
    });
  } catch (err) {
    next(err);
  }
});
