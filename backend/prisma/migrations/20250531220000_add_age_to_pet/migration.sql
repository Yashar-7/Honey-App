-- Campos del formulario de registro del dueño
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "age" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "characteristics" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "finder_message" TEXT;
