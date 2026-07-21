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

/** Si es true (default), ante caída de Supabase se permite ir a registro con serial válido. */
export function isQrStockSoftFallbackEnabled(): boolean {
  const raw = process.env.QR_STOCK_SOFT_FALLBACK?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function normalizeStockSerial(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const serial = value.trim().toUpperCase();
  return SERIAL_PATTERN.test(serial) ? serial : null;
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
