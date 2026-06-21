-- AlterTable
ALTER TABLE "pets" ADD COLUMN "stock_serial" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pets_stock_serial_key" ON "pets"("stock_serial");
