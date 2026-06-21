import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  lookupQrStock,
  normalizeStockSerial,
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

    const stock = await lookupQrStock(serial);
    if (!stock) {
      throw new AppError(404, "Este código de chapita no es válido");
    }

    let petQrToken: string | null = null;
    if (stock.isUsed) {
      const pet = await prisma.pet.findFirst({
        where: { stockSerial: serial, isActive: true },
        select: { qrToken: true },
      });
      petQrToken = pet?.qrToken ?? null;
    }

    res.json({
      serial: stock.serial,
      isUsed: stock.isUsed,
      available: !stock.isUsed,
      createdAt: stock.createdAt,
      petQrToken,
    });
  } catch (err) {
    next(err);
  }
});
