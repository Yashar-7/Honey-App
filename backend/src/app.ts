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

app.use("/api/qr", qrRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRouter);
app.use("/api/pets", petsRouter);
app.use("/api/owner", ownerRouter);

app.use(errorHandler);

export default app;
