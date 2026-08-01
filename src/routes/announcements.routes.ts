import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware";
import type { AuthenticatedRequest } from "../types/express";
import {
  announcementInputSchema,
  createAnnouncement,
  deleteAnnouncement,
  listAllAnnouncementsForAdmin,
  listPublishedAnnouncements,
  updateAnnouncement,
} from "../services/announcement.service";

export const announcementsRouter = Router();

/**
 * GET /api/announcements
 * Feed público (landing / app): solo avisos publicados.
 */
announcementsRouter.get("/", async (_req, res, next) => {
  try {
    const announcements = await listPublishedAnnouncements(12);
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/announcements/admin
 * Listado completo para la consola admin.
 */
announcementsRouter.get("/admin", requireAdmin, async (_req, res, next) => {
  try {
    const announcements = await listAllAnnouncementsForAdmin();
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/announcements/admin
 * Publicar aviso (zoonosis, tips, noticias).
 */
announcementsRouter.post("/admin", requireAdmin, async (req, res, next) => {
  try {
    const input = announcementInputSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId;
    const announcement = await createAnnouncement(input, userId);
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/announcements/admin/:id
 */
announcementsRouter.patch("/admin/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const announcement = await updateAnnouncement(String(id), req.body);
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/announcements/admin/:id
 */
announcementsRouter.delete("/admin/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteAnnouncement(String(id));
    res.json(result);
  } catch (err) {
    next(err);
  }
});
