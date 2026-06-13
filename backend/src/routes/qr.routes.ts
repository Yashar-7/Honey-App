import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { resolveQrToken } from "../lib/qrToken";
import { createScanSchema } from "../schemas/scan.schema";
import { getPetByQrToken, registerScan } from "../services/qr.service";
import {
  generateQrSvgForToken,
  getQrSvgDownloadFilename,
} from "../services/qrGenerate.service";

export const qrRouter = Router();

/**
 * GET /api/qr/generate/:token
 * Genera el código QR vectorial (SVG) para imprenta / chapita física.
 */
qrRouter.get("/generate/:token", async (req, res, next) => {
  try {
    const result = await generateQrSvgForToken(req.params.token, req);
    const asDownload = req.query.download === "1" || req.query.download === "true";

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Honey-Scan-Url", result.scanUrl);

    if (asDownload) {
      const filename = getQrSvgDownloadFilename(result.petName, result.qrToken);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }

    res.send(result.svg);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/qr/:token
 * Resuelve el estado de un token QR (público, sin autenticación).
 * Devuelve la ficha médica y datos de contacto anónimo si la mascota está registrada.
 * Responde 404 si el token no existe y 410 si fue desactivado.
 */
qrRouter.get("/:token", async (req, res, next) => {
  try {
    const token = String(req.params.token);
    const resolved = await resolveQrToken(token);

    if (resolved.status === "not_found") {
      throw new AppError(404, "Token QR no encontrado");
    }

    if (resolved.status === "deactivated" || !resolved.isActive) {
      throw new AppError(410, "Este código QR fue desactivado");
    }

    const petData = await getPetByQrToken(resolved.qrToken, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    res.json({
      isRegistered: true,
      pet: {
        id: petData.pet.id,
        name: petData.pet.name,
        species: petData.pet.species,
        breed: petData.pet.breed,
        age: petData.pet.age,
        sex: petData.pet.sex,
        size: petData.pet.size,
        color: petData.pet.color,
        distinguishingMarks: petData.pet.distinguishingMarks ?? null,
        characteristics: petData.pet.characteristics,
        medicalConditions: petData.pet.medicalConditions ?? null,
        medications: petData.pet.medications ?? null,
        allergies: petData.pet.allergies ?? null,
        behavioralNotes: petData.pet.behavioralNotes ?? null,
        finderMessage: petData.pet.finderMessage,
        photoUrl: petData.pet.photoUrl,
      },
      contact: {
        sessionId: petData.contact.sessionId,
        expiresAt: petData.contact.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/qr/:token/scans
 * Registra coordenadas del vecino y actualiza lastLat / lastLng en Neon.
 */
qrRouter.post("/:token/scans", async (req, res, next) => {
  try {
    const body = createScanSchema.parse(req.body);

    const result = await registerScan(req.params.token, body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});