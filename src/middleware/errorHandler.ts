import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: { error: string; code?: string } = { error: err.message };
    if (err.code) body.code = err.code;
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "La imagen supera el límite de 5 MB"
        : err.message;
    res.status(400).json({ error: message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
