import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { createIpRateLimiter } from "../middleware/rateLimit.middleware";
import {
  buildUniqueImageFileName,
  uploadConfig,
} from "../middleware/upload.middleware";
import {
  DEFAULT_PET_PHOTOS_BUCKET,
  uploadToSupabase,
} from "../lib/supabase";
import {
  communityAlertFreeSchema,
  createCommunityAlert,
  listOpenCommunityAlerts,
} from "../services/communityAlert.service";

export const communityAlertsRouter = Router();

const uploadCommunityPhoto = uploadConfig.single("photo");

const freeAlertRateLimit = createIpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Límite de alertas solidarias alcanzado. Esperá unos minutos antes de enviar otra.",
});

/**
 * GET /api/community-alerts
 * Feed público de alertas abiertas (sin WhatsApp expuesto).
 */
communityAlertsRouter.get("/", async (_req, res, next) => {
  try {
    const alerts = await listOpenCommunityAlerts(16);
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community-alerts/free
 * Alerta solidaria sin registro ni chapita. Foto → Supabase, fila → Neon.
 */
communityAlertsRouter.post(
  "/free",
  freeAlertRateLimit,
  (req, res, next) => {
    uploadCommunityPhoto(req, res, (err) => {
      if (err) {
        next(err instanceof Error ? new AppError(400, err.message) : err);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, "Subí una foto del animal (obligatoria)");
      }

      const input = communityAlertFreeSchema.parse({
        species: String(req.body?.species || "").toLowerCase(),
        zone: req.body?.zone,
        whatsapp: req.body?.whatsapp,
        notes: req.body?.notes || null,
      });

      const fileName = `community/${buildUniqueImageFileName(
        req.file.originalname.endsWith(".webp")
          ? req.file.originalname
          : `${Date.now()}.webp`,
      )}`;

      const photoUrl = await uploadToSupabase(
        req.file.buffer,
        fileName,
        DEFAULT_PET_PHOTOS_BUCKET,
        req.file.mimetype || "image/webp",
      );

      const ip =
        (typeof req.ip === "string" && req.ip) ||
        req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null;

      const alert = await createCommunityAlert({
        input,
        photoUrl,
        ipAddress: ip,
      });

      res.status(201).json({
        message: "Alerta solidaria publicada. Gracias por cuidar la calle.",
        alert,
      });
    } catch (err) {
      next(err);
    }
  },
);
