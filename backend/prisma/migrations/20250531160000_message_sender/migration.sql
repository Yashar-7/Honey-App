-- AlterTable
ALTER TABLE "messages" ADD COLUMN "sender" TEXT NOT NULL DEFAULT 'finder';

-- DropIndex
DROP INDEX "messages_session_id_created_at_idx";

-- CreateIndex
CREATE INDEX "messages_session_id_created_at_idx" ON "messages"("session_id", "created_at" ASC);
