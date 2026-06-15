-- Fidelización veterinaria: PetShop + recordatorios en Pet

CREATE TABLE "pet_shops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_shops_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pet_shops_is_active_idx" ON "pet_shops"("is_active");

ALTER TABLE "pets" ADD COLUMN "last_vaccination_date" DATE;
ALTER TABLE "pets" ADD COLUMN "last_deworming_date" DATE;
ALTER TABLE "pets" ADD COLUMN "next_reminder_date" DATE;
ALTER TABLE "pets" ADD COLUMN "vet_clinic_id" TEXT;

CREATE INDEX "pets_next_reminder_date_idx" ON "pets"("next_reminder_date");
CREATE INDEX "pets_vet_clinic_id_idx" ON "pets"("vet_clinic_id");

ALTER TABLE "pets" ADD CONSTRAINT "pets_vet_clinic_id_fkey" FOREIGN KEY ("vet_clinic_id") REFERENCES "pet_shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
