-- CreateTable
CREATE TABLE "qr_token_history" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "deactivated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_token_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_sessions" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_token_history_qr_token_key" ON "qr_token_history"("qr_token");

-- CreateIndex
CREATE INDEX "qr_token_history_pet_id_idx" ON "qr_token_history"("pet_id");

-- CreateIndex
CREATE INDEX "contact_sessions_pet_id_idx" ON "contact_sessions"("pet_id");

-- AddForeignKey
ALTER TABLE "qr_token_history" ADD CONSTRAINT "qr_token_history_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_sessions" ADD CONSTRAINT "contact_sessions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
