import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limit en memoria (por IP). Suficiente para MVP serverless/single-instance.
 * windowMs + max requests.
 */
export function createIpRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max, message = "Demasiados intentos. Probá de nuevo en unos minutos." } =
    options;

  return function ipRateLimiter(req: Request, _res: Response, next: NextFunction) {
    const ip =
      (typeof req.ip === "string" && req.ip) ||
      req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const key = `${req.path}:${ip}`;
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      next(new AppError(429, message));
      return;
    }

    next();
  };
}

/** Limpieza ocasional para no crecer sin límite en procesos largos. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
