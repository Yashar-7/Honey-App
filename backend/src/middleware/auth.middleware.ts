import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-cambiar-en-produccion";

export interface JwtPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticación requerido" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    Object.assign(req, { userId: payload.sub });
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
}
