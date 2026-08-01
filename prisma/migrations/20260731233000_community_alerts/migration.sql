-- Alertas solidarias de callejeros (sin registro)
CREATE TABLE IF NOT EXISTS "community_alerts" (
    "id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "community_alerts_status_created_at_idx"
  ON "community_alerts"("status", "created_at" DESC);
