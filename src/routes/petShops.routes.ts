import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware";
import {
  createPetShop,
  listActivePetShops,
  listAllPetShopsForAdmin,
  petShopInputSchema,
  setPetShopActive,
} from "../services/petShop.service";

export const petShopsRouter = Router();

/**
 * GET /api/pet-shops
 * Lista veterinarias y pet shops aliados (público / landing / registro).
 */
petShopsRouter.get("/", async (_req, res, next) => {
  try {
    const petShops = await listActivePetShops();
    res.json({ petShops });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/pet-shops/admin
 * Listado completo para la consola admin.
 */
petShopsRouter.get("/admin", requireAdmin, async (_req, res, next) => {
  try {
    const petShops = await listAllPetShopsForAdmin();
    res.json({ petShops });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/pet-shops/admin
 * Alta de comercio aliado (persistencia real en pet_shops / Neon).
 */
petShopsRouter.post("/admin", requireAdmin, async (req, res, next) => {
  try {
    const input = petShopInputSchema.parse({
      ...req.body,
      latitude:
        typeof req.body?.latitude === "string"
          ? Number(req.body.latitude)
          : req.body?.latitude,
      longitude:
        typeof req.body?.longitude === "string"
          ? Number(req.body.longitude)
          : req.body?.longitude,
    });
    const petShop = await createPetShop(input);
    res.status(201).json({ petShop });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/pet-shops/admin/:id
 * Activar / desactivar pin en el mapa.
 */
petShopsRouter.patch("/admin/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isActive = Boolean(req.body?.isActive);
    const petShop = await setPetShopActive(String(id), isActive);
    res.json({ petShop });
  } catch (err) {
    next(err);
  }
});
