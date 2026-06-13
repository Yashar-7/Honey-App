import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../middleware/errorHandler";

let adminClient: SupabaseClient | null = null;

function readSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new AppError(
      503,
      "Almacenamiento de imágenes no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  return { url, serviceRoleKey };
}

/** Cliente admin (service role). Solo usar en el servidor. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const { url, serviceRoleKey } = readSupabaseEnv();
    adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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
