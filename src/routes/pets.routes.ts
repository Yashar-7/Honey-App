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
import { AuthenticatedRequest } from "../types/express";

export const petsRouter = Router();

/**
 * POST /api/pets
 * Crea una mascota
 */
petsRouter.post(
  "/",
  requireAuth,
  (req, res, next) => {
    // Diagnóstico
    console.log("--- PETS API: Recibiendo petición ---");
    console.log("Content-Type:", req.headers['content-type']);
    
    uploadPetPhoto(req, res, (err) => {
      if (err) {
        console.error("Error en Multer:", err);
        next(err instanceof Error ? new AppError(400, err.message) : err);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      console.log("Procesando creación de mascota para usuario:", userId);
      
      // Validación Zod
      const body = createPetSchema.parse(req.body);

      let photoUrl: string | undefined;
      if (req.file) {
        console.log("Archivo detectado, subiendo a Supabase...");
        const fileName = buildUniqueImageFileName(req.file.originalname);
        photoUrl = await uploadToSupabase(
          req.file.buffer,
          fileName,
          DEFAULT_PET_PHOTOS_BUCKET,
          req.file.mimetype,
        );
        console.log("Foto subida exitosamente:", photoUrl);
      }

      const result = await createPet(userId, body, {
        photoUrl,
        req,
      });
      
      console.log("Mascota creada con éxito en DB.");
      res.status(201).json(result);
    } catch (err) {
      console.error("Error final en pets.routes:", err);
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