-- AlterTable
ALTER TABLE "pets" ADD COLUMN     "color" TEXT,
ADD COLUMN     "distinguishing_marks" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "zip_code" TEXT;

-- CreateIndex
CREATE INDEX "pets_neighborhood_idx" ON "pets"("neighborhood");

-- CreateIndex
CREATE INDEX "pets_zip_code_idx" ON "pets"("zip_code");
