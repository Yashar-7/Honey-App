import { getSupabaseAdmin } from "../lib/supabase";
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

/** Busca un serial en el stock de Supabase. */
export async function lookupQrStock(serial: string): Promise<QrStockRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(QR_STOCK_TABLE)
    .select("serial, isUsed, createdAt")
    .eq("serial", serial)
    .maybeSingle();

  if (error) {
    throw new AppError(502, `No se pudo consultar el stock QR: ${error.message}`);
  }

  return data ? mapRow(data as QrStockRow) : null;
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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(QR_STOCK_TABLE)
    .update({ isUsed: true })
    .eq("serial", serial)
    .eq("isUsed", false)
    .select("serial, isUsed, createdAt")
    .maybeSingle();

  if (error) {
    throw new AppError(502, `No se pudo activar la chapita: ${error.message}`);
  }

  if (!data) {
    throw new AppError(409, "Esta chapita ya fue activada o no existe");
  }

  return mapRow(data as QrStockRow);
}

/** Revierte un serial a disponible (rollback si falla el registro de mascota). */
export async function releaseStockSerial(serial: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(QR_STOCK_TABLE)
    .update({ isUsed: false })
    .eq("serial", serial);

  if (error) {
    console.error(`[qrStock] No se pudo revertir serial ${serial}:`, error.message);
  }
}
