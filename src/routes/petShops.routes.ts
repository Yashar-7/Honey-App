import { Router } from "express";
import { listActivePetShops } from "../services/petShop.service";

export const petShopsRouter = Router();

/**
 * GET /api/pet-shops
 * Lista veterinarias y pet shops aliados para el registro.
 */
petShopsRouter.get("/", async (_req, res, next) => {
  try {
    const petShops = await listActivePetShops();
    res.json({ petShops });
  } catch (err) {
    next(err);
  }
});
