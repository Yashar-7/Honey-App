import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  isQrStockSoftFallbackEnabled,
  lookupQrStock,
  normalizeStockSerial,
  QrStockUnavailableError,
} from "../services/qrStock.service";

export const qrStockRouter = Router();

/**
 * GET /api/qr-stock/:serial
 * Consulta pública del estado de una chapita física.
 */
qrStockRouter.get("/:serial", async (req, res, next) => {
  try {
    const serial = normalizeStockSerial(req.params.serial);
    if (!serial) {
      throw new AppError(400, "Serial inválido (formato esperado: HNY-001)");
    }

    // Si ya hay mascota en Neon, no dependemos de Supabase.
    const existingPet = await prisma.pet.findFirst({
      where: { stockSerial: serial, isActive: true },
      select: { qrToken: true },
    });
    if (existingPet) {
      res.json({
        serial,
        isUsed: true,
        available: false,
        createdAt: null,
        petQrToken: existingPet.qrToken,
        source: "neon",
      });
      return;
    }

    try {
      const stock = await lookupQrStock(serial);
      if (!stock) {
        throw new AppError(404, "Este código de chapita no es válido");
      }

      res.json({
        serial: stock.serial,
        isUsed: stock.isUsed,
        available: !stock.isUsed,
        createdAt: stock.createdAt,
        petQrToken: null,
        source: "supabase",
      });
    } catch (err) {
      if (err instanceof QrStockUnavailableError) {
        res.status(503).json({
          error: err.message,
          code: err.code,
          serial,
          softFallback: isQrStockSoftFallbackEnabled(),
          registroUrl: isQrStockSoftFallbackEnabled()
            ? `/registro?serial=${encodeURIComponent(serial)}&modo=registro&offline=1`
            : null,
        });
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});
