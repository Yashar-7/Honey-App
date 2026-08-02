import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getAdminEmailAllowlist, isAdminEmail } from "../lib/adminAccess";
import { AppError } from "../middleware/errorHandler";
import { signToken } from "../middleware/auth.middleware";

export { getAdminEmailAllowlist, isAdminEmail };

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  email: z.string().trim().email("Email inválido").max(254),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128),
});

export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new AppError(409, "Ya existe una cuenta con ese email");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return {
    token: signToken(user.id),
    user,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(401, "Credenciales inválidas");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    throw new AppError(401, "Credenciales inválidas");
  }

  return {
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * Login de administrador: valida User en Neon + allowlist ADMIN_EMAILS.
 * Omite el flujo chapita/stockSerial; el cliente debe ir a /admin/dashboard.
 */
export async function loginAdminUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const allow = getAdminEmailAllowlist();

  if (allow.size === 0) {
    throw new AppError(
      503,
      "Acceso admin no configurado (definí ADMIN_EMAILS en el entorno)",
    );
  }

  if (!allow.has(normalized)) {
    throw new AppError(403, "No autorizado para acceso administrativo");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });

  if (!user) {
    throw new AppError(401, "Credenciales inválidas");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Credenciales inválidas");
  }

  return {
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    isAdmin: true as const,
    bypassStockSerial: true as const,
    redirectTo: "/admin/dashboard" as const,
  };
}
