-- Ficha Médica Avanzada
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "medical_conditions" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "medications" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "allergies" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "behavioral_notes" TEXT;
