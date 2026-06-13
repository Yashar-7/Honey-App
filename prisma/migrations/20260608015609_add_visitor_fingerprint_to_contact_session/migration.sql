-- AlterTable
ALTER TABLE "contact_sessions" ADD COLUMN     "visitor_fingerprint" TEXT;

-- CreateIndex
CREATE INDEX "contact_sessions_pet_id_visitor_fingerprint_status_idx" ON "contact_sessions"("pet_id", "visitor_fingerprint", "status");
