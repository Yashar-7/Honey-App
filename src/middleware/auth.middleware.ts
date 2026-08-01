import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { isAdminEmail } from "../lib/adminAccess";
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

/** Exige JWT válido + email en ADMIN_EMAILS. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticación requerido" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user || !isAdminEmail(user.email)) {
      next(new AppError(403, "No autorizado para acceso administrativo"));
      return;
    }

    Object.assign(req, { userId: user.id, adminEmail: user.email });
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, "Token inválido o expirado"));
  }
}
