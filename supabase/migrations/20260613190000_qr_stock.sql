-- Tabla QrStock: stock de chapas físicas preimpresas (Honey App)
-- Ejecutar en el SQL Editor de Supabase o vía CLI.

CREATE TABLE IF NOT EXISTS public."QrStock" (
  serial TEXT PRIMARY KEY,
  "isUsed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "QrStock_isUsed_idx" ON public."QrStock" ("isUsed");

ALTER TABLE public."QrStock" ENABLE ROW LEVEL SECURITY;

-- Sin políticas públicas: solo service_role (backend + scripts) accede a esta tabla.
