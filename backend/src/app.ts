import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";
import { alertsRouter } from "./routes/alerts.routes";
import { chatRouter } from "./routes/chat.routes";
import { authRouter } from "./routes/auth.routes";
import { ownerRouter } from "./routes/owner.routes";
import { petsRouter } from "./routes/pets.routes";
import { qrRouter } from "./routes/qr.routes";

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "honey-app-backend" });
});

/**
 * Vercel rewrites a `/api/index.ts` pueden entregar la URL sin el prefijo `/api`.
 * Este middleware restaura la ruta completa para que coincida con app.use("/api/...", ...).
 */
app.use((req, _res, next) => {
  const path = req.path;
  const needsApiPrefix =
    path.startsWith("/qr") ||
    path.startsWith("/alerts") ||
    path.startsWith("/chat") ||
    path.startsWith("/auth") ||
    path.startsWith("/pets") ||
    path.startsWith("/owner");

  if (needsApiPrefix && !path.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  next();
});

app.use("/api/qr", qrRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRouter);
app.use("/api/pets", petsRouter);
app.use("/api/owner", ownerRouter);

app.use(errorHandler);

export default app;
