import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../middleware/errorHandler";

/** Clave de almacenamiento compartida con public/js/supabase-client.js (navegador). */
export const SUPABASE_BROWSER_AUTH_STORAGE_KEY = "honey-app-supabase-auth";

/** Opciones del cliente anon en el navegador (realtime + sesión persistente). */
export const SUPABASE_BROWSER_CLIENT_OPTIONS = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: SUPABASE_BROWSER_AUTH_STORAGE_KEY,
  },
} as const;

let adminClient: SupabaseClient | null = null;

const FETCH_TIMEOUT_MS = 8_000;

/** fetch con timeout — evita colgar la función serverless en Vercel. */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const parentSignal = init?.signal;
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

function normalizeSupabaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export function isSupabaseAdminConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

function readSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawUrl || !serviceRoleKey) {
    throw new AppError(
      503,
      "Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const url = normalizeSupabaseUrl(rawUrl);

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("supabase")) {
      console.warn(
        `[supabase] SUPABASE_URL host inusual: ${parsed.hostname} (¿URL correcta del proyecto?)`,
      );
    }
  } catch {
    throw new AppError(503, "SUPABASE_URL inválida — debe ser https://xxxx.supabase.co");
  }

  return { url, serviceRoleKey };
}

/** Cliente admin (service role). Singleton — solo usar en el servidor. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const { url, serviceRoleKey } = readSupabaseEnv();
    adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    });
  }
  return adminClient;
}

/**
 * Sube un archivo a Supabase Storage y devuelve la URL pública.
 * El bucket debe existir y estar configurado como público (o con política de lectura).
 */
export async function uploadToSupabase(
  file: Buffer,
  fileName: string,
  bucket: string,
  contentType = "application/octet-stream",
): Promise<string> {
  const objectPath = fileName.replace(/^\/+/, "");
  if (!objectPath) {
    throw new AppError(400, "Nombre de archivo inválido");
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new AppError(502, `No se pudo subir la imagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

/** Bucket por defecto para fotos de perfil de mascotas. */
export const DEFAULT_PET_PHOTOS_BUCKET =
  process.env.SUPABASE_PET_PHOTOS_BUCKET?.trim() || "pet-photos";
