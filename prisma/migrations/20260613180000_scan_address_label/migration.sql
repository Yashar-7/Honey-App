-- Dirección legible en escaneos GPS (geocodificación inversa)

ALTER TABLE "scans" ADD COLUMN "address_label" TEXT;
