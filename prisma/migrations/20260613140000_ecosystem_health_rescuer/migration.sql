-- Ecosistema salud + rescatistas + ayuda vecinal

ALTER TABLE "users" ADD COLUMN "reputation_score" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "rescuer_profiles" (
    "id" TEXT NOT NULL,
    "visitor_fingerprint" TEXT NOT NULL,
    "reputation_score" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rescuer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rescuer_profiles_visitor_fingerprint_key" ON "rescuer_profiles"("visitor_fingerprint");
CREATE INDEX "rescuer_profiles_user_id_idx" ON "rescuer_profiles"("user_id");

ALTER TABLE "rescuer_profiles" ADD CONSTRAINT "rescuer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_sessions" ADD COLUMN "returned_at" TIMESTAMP(3);
