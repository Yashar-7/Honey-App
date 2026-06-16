import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadMessageImage } from "../middleware/upload.middleware";
import { AppError } from "../middleware/errorHandler";
import { parseCreateMessageInput, replyMessageSchema } from "../schemas/message.schema";
import {
  getChatSessionRealtimeConfig,
  getSessionMessages,
  markPetAsReturned,
  replySessionMessage,
  resolveCaseByOwner,
  sendSessionMessage,
} from "../services/chat.service";
import { getPublicRealtimeConfig } from "../services/realtime.service";
import { AuthenticatedRequest } from "../types/express";
import { uploadToSupabase } from "../lib/supabase";
import { buildUniqueImageFileName } from "../middleware/upload.middleware";

export const chatRouter = Router();

chatRouter.get("/sessions/:sessionId/realtime-config", async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    await getSessionMessages(sessionId);

    const realtime = getPublicRealtimeConfig();
    if (!realtime) {
      throw new AppError(
        503,
        "Realtime no configurado (SUPABASE_URL / SUPABASE_ANON_KEY)",
      );
    }

    res.json({
      ...realtime,
      ...getChatSessionRealtimeConfig(sessionId),
    });
  } catch (err) {
    next(err);
  }
});

// RUTA GET
chatRouter.get("/sessions/:sessionId/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.sessionId);
    const result = await getSessionMessages(sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// RUTA POST
chatRouter.post(
  "/sessions/:sessionId/messages",
  (req, res, next) => {
    uploadMessageImage(req, res, (err) => {
      if (err) {
        next(err instanceof Error ? new AppError(400, err.message) : err);
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = String(req.params.sessionId);
      const input = parseCreateMessageInput(req.body, Boolean(req.file));

      if (req.file) {
        const fileName = buildUniqueImageFileName(req.file.originalname);
        input.imageUrl = await uploadToSupabase(
          req.file.buffer,
          fileName,
          "chat-images",
          req.file.mimetype
        );
      }

      const result = await sendSessionMessage(sessionId, input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

chatRouter.post(
  "/sessions/:sessionId/reply",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const sessionId = String(req.params.sessionId);
      const input = replyMessageSchema.parse(req.body);
      const result = await replySessionMessage(sessionId, userId, input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

chatRouter.post(
  "/sessions/:sessionId/resolve",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const sessionId = String(req.params.sessionId);
      const result = await resolveCaseByOwner(sessionId, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

chatRouter.post(
  "/sessions/:sessionId/mark-returned",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = String(req.params.sessionId);
      const result = await markPetAsReturned(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);