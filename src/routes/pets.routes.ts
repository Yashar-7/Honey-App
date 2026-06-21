import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { AppError } from "../middleware/errorHandler";
import {
  DEFAULT_PET_PHOTOS_BUCKET,
  uploadToSupabase,
} from "../lib/supabase";
import {
  buildUniqueImageFileName,
  uploadPetPhoto,
} from "../middleware/upload.middleware";
import { createPetSchema, updateHealthObservationsSchema } from "../schemas/pet.schema";
import { createPet, rotatePetQrToken, updatePetHealthObservations } from "../services/pet.service";
import { processVaccinationReminders } from "../services/vaccinationReminder.service";
import { AuthenticatedRequest } from "../types/express";

export const petsRouter = Router();

/**
 * POST /api/pets/reminders/process
 * Dispara recordatorios de vacuna (30 días). Protegido con CRON_SECRET si está configurado.
 */
petsRouter.post("/reminders/process", async (req, res, next) => {
  try {
    const expected = process.env.CRON_SECRET?.trim();
    if (expected) {
      const got = req.get("x-cron-secret");
      if (got !== expected) {
        throw new AppError(401, "No autorizado");
      }
    }

    const result = await processVaccinationReminders(30);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pets
 * Crea una mascota
 */
petsRouter.post(
  "/",
  requireAuth,
  (req, res, next) => {
    uploadPetPhoto(req, res, (err) => {
      if (err) {
        next(err instanceof Error ? new AppError(400, err.message) : err);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const body = createPetSchema.parse(req.body);

      let photoUrl: string | undefined;
      if (req.file) {
        const fileName = buildUniqueImageFileName(req.file.originalname);
        photoUrl = await uploadToSupabase(
          req.file.buffer,
          fileName,
          DEFAULT_PET_PHOTOS_BUCKET,
          req.file.mimetype,
        );
      }

      const result = await createPet(userId, body, {
        photoUrl,
        req,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/pets/:id/health
 * Actualiza observaciones de salud (visible al escanear QR si se pierde).
 */
petsRouter.patch("/:id/health", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const petId = String(req.params.id);
    const { healthObservations } = updateHealthObservationsSchema.parse(req.body);
    const result = await updatePetHealthObservations(
      petId,
      userId,
      healthObservations,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pets/:id/rotate-qr
 */
petsRouter.post(
  "/:id/rotate-qr",
  requireAuth,
  async (req, res, next) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const petId = String(req.params.id);
      const result = await rotatePetQrToken(petId, userId, req);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);