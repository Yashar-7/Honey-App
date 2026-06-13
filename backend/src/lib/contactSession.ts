import { createHash } from "crypto";

const SESSION_TTL_HOURS = 72;

export function getContactSessionExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);
  return expiresAt;
}

/** Huella estable por dispositivo/navegador (IP + User-Agent normalizados). */
export function buildVisitorFingerprint(
  ipAddress?: string,
  userAgent?: string,
): string {
  const ip = ipAddress?.trim() || "unknown-ip";
  const ua = userAgent?.trim() || "unknown-ua";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex");
}
