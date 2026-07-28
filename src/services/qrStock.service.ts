import { getSupabaseAdmin, isSupabaseAdminConfigured } from "../lib/supabase";
import { AppError } from "../middleware/errorHandler";

const QR_STOCK_TABLE = "QrStock";

export type QrStockRecord = {
  serial: string;
  isUsed: boolean;
  createdAt: string;
};

type QrStockRow = {
  serial: string;
  isUsed: boolean;
  createdAt: string;
};

const SERIAL_PATTERN = /^HNY-\d{3}$/;

/** Error de infraestructura (red / timeout / env) — no es “serial inválido”. */
export class QrStockUnavailableError extends AppError {
  constructor(detail?: string) {
    super(
      503,
      detail
        ? `Servicio de chapitas temporalmente no disponible: ${detail}`
        : "Servicio de chapitas temporalmente no disponible. Intentá de nuevo en unos minutos.",
      "STOCK_UNAVAILABLE",
    );
    this.name = "QrStockUnavailableError";
  }
}

/** Si es true, ante caída de Supabase se permite ir a registro (NO recomendado en prod comercial). Default: OFF. */
export function isQrStockSoftFallbackEnabled(): boolean {
  const raw = process.env.QR_STOCK_SOFT_FALLBACK?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function normalizeStockSerial(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const serial = value.trim().toUpperCase();
  return SERIAL_PATTERN.test(serial) ? serial : null;
}

/**
 * Código corto alfanumérico (≤8 chars) para QR de baja densidad en chapita láser.
 * HNY-001 → "000001" (base36, pad 6). Debe coincidir con scripts/generate-qrs.mjs.
 */
export function serialToShortCode(serial: string): string {
  const n = Number(String(serial).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 999) {
    throw new Error(`Serial fuera de rango para código corto: ${serial}`);
  }
  return n.toString(36).padStart(6, "0");
}

/**
 * Código corto de chapita láser → serial oficial HNY-XXX.
 * Acepta "000001", "001", "1" y códigos base36 del generador (p. ej. "00001e" = 50).
 */
export function shortCodeToSerial(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const raw = code.trim();
  if (!raw) return null;

  // Ya viene como serial oficial
  const asSerial = normalizeStockSerial(raw);
  if (asSerial) return asSerial;

  const compact = raw.toLowerCase();
  if (!/^[0-9a-z]{1,8}$/.test(compact)) return null;

  // Preferir decimal cuando es solo dígitos (000001 / 001 → 1).
  // Si trae a-z, es base36 del script generate-qrs (00001e → 50).
  const n = /^[0-9]+$/.test(compact)
    ? Number.parseInt(compact, 10)
    : Number.parseInt(compact, 36);

  if (!Number.isFinite(n) || n < 1 || n > 999) return null;
  return `HNY-${String(n).padStart(3, "0")}`;
}

function mapRow(row: QrStockRow): QrStockRecord {
  return {
    serial: row.serial,
    isUsed: Boolean(row.isUsed),
    createdAt: row.createdAt,
  };
}

function toUserSafeDetail(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) {
    const msg = err.message || "";
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|aborted|network/i.test(msg)) {
      return "no se pudo conectar con Supabase (revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel)";
    }
    return msg.slice(0, 160);
  }
  return "error desconocido";
}

async function withStockGuard<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  if (!isSupabaseAdminConfigured()) {
    throw new QrStockUnavailableError(
      "faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno",
    );
  }

  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error(`[qrStock] ${operation} falló:`, err);
    throw new QrStockUnavailableError(toUserSafeDetail(err));
  }
}

/** Busca un serial en el stock de Supabase. */
export async function lookupQrStock(serial: string): Promise<QrStockRecord | null> {
  return withStockGuard("lookup", async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(QR_STOCK_TABLE)
      .select("serial, isUsed, createdAt")
      .eq("serial", serial)
      .maybeSingle();

    if (error) {
      // PostgREST / red: el cliente a veces pone "TypeError: fetch failed" en message
      if (/fetch failed|Failed to fetch|network/i.test(error.message)) {
        throw new QrStockUnavailableError(toUserSafeDetail(new Error(error.message)));
      }
      throw new AppError(502, `No se pudo consultar el stock QR: ${error.message}`);
    }

    return data ? mapRow(data as QrStockRow) : null;
  });
}

/** Valida que el serial exista y esté disponible para activación. */
export async function assertStockSerialAvailable(serial: string): Promise<QrStockRecord> {
  const stock = await lookupQrStock(serial);
  if (!stock) {
    throw new AppError(404, "Este código de chapita no es válido");
  }
  if (stock.isUsed) {
    throw new AppError(409, "Esta chapita ya fue activada");
  }
  return stock;
}

/**
 * Marca un serial como usado (activación completada).
 * Solo actualiza filas con isUsed = false (evita condiciones de carrera).
 */
export async function markStockSerialUsed(serial: string): Promise<QrStockRecord> {
  return withStockGuard("markUsed", async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(QR_STOCK_TABLE)
      .update({ isUsed: true })
      .eq("serial", serial)
      .eq("isUsed", false)
      .select("serial, isUsed, createdAt")
      .maybeSingle();

    if (error) {
      if (/fetch failed|Failed to fetch|network/i.test(error.message)) {
        throw new QrStockUnavailableError(toUserSafeDetail(new Error(error.message)));
      }
      throw new AppError(502, `No se pudo activar la chapita: ${error.message}`);
    }

    if (!data) {
      throw new AppError(409, "Esta chapita ya fue activada o no existe");
    }

    return mapRow(data as QrStockRow);
  });
}

/** Revierte un serial a disponible (rollback si falla el registro de mascota). */
export async function releaseStockSerial(serial: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(QR_STOCK_TABLE)
      .update({ isUsed: false })
      .eq("serial", serial);

    if (error) {
      console.error(`[qrStock] No se pudo revertir serial ${serial}:`, error.message);
    }
  } catch (err) {
    console.error(`[qrStock] No se pudo revertir serial ${serial}:`, err);
  }
}
