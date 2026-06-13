import type { Request } from "express";

/**
 * URL pública donde el vecino escanea la chapita (vista móvil + token).
 * Prioridad: BASE_URL → APP_PUBLIC_URL → host de la petición (Ngrok) → localhost.
 */
export function resolvePublicBaseUrl(
  req?: Pick<Request, "get" | "protocol">,
): string {
  const fromEnv =
    process.env.BASE_URL?.trim() || process.env.APP_PUBLIC_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (req) {
    const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || req.get("host");
    const proto =
      forwardedProto ||
      (req.protocol === "https" ? "https" : "http");

    if (host && !/^localhost(:\d+)?$/i.test(host) && !host.startsWith("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

/** @deprecated Usar resolvePublicBaseUrl */
export function getAppPublicBaseUrl(): string {
  return resolvePublicBaseUrl();
}

export function buildPetScanUrl(
  qrToken: string,
  req?: Pick<Request, "get" | "protocol">,
): string {
  const base = resolvePublicBaseUrl(req);
  const params = new URLSearchParams({ token: qrToken });
  return `${base}/?${params.toString()}`;
}
