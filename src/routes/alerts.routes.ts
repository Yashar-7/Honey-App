import { Router } from "express";
import { createLocationAlertSchema, neighborhoodHelpSchema } from "../schemas/alert.schema";
import { getActiveLostPetAlerts } from "../services/alerts.service";
import { requestNeighborhoodHelp } from "../services/neighborhoodHelp.service";
import { registerScan } from "../services/qr.service";

export const alertsRouter = Router();

/**
 * POST /api/alerts
 * Vecino en la calle: reporta GPS real vinculado al token QR escaneado.
 */
alertsRouter.post("/", async (req, res, next) => {
  try {
    const body = createLocationAlertSchema.parse(req.body);

    const result = await registerScan(
      body.qrToken,
      {
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
      },
    );

    res.status(201).json({
      success: true,
      ...result,
      message: "Ubicación registrada en el sistema",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/neighborhood-help
 * Protocolo Ayuda Cercana: push a vecinos Honey en radio del escaneo.
 */
alertsRouter.post("/neighborhood-help", async (req, res, next) => {
  try {
    const body = neighborhoodHelpSchema.parse(req.body);
    const result = await requestNeighborhoodHelp(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/active
 * Panel global Smart Tech: mascotas con isLost === true en Neon.
 */
alertsRouter.get("/active", async (_req, res, next) => {
  try {
    const result = await getActiveLostPetAlerts();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
