import { randomBytes } from "crypto";
import path from "path";
import type { Request } from "express";
import multer from "multer";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/** Genera nombre único */
export function buildUniqueImageFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
  return `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`;
}

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes (JPEG, PNG, WebP, GIF)"));
  }
}

// CONFIGURACIÓN UNIFICADA: Todo en memoria
const memoryStorage = multer.memoryStorage();

export const uploadConfig = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Exportamos ambos como single para mantener compatibilidad con tus rutas actuales
export const uploadPetPhoto = uploadConfig.single("photo");
export const uploadMessageImage = uploadConfig.single("image");