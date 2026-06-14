import "dotenv/config";
import cors from "cors";
import express from "express";
import { existsSync } from "fs";
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
app.use(express.json({ limit: "10mb" }));

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "honey-app",
    timestamp: new Date().toISOString(),
  });
});

app.get("/login", (_req, res) => {
  res.redirect("/login.html");
});

app.get("/dashboard", (_req, res) => {
  res.redirect("/dashboard.html");
});

app.get("/registro", (req, res) => {
  const v2Index = path.join(publicDir, "registro-v2", "index.html");
  const queryStart = req.url.indexOf("?");
  const query = queryStart >= 0 ? req.url.slice(queryStart) : "";
  if (existsSync(v2Index)) {
    res.redirect(query ? `/registro-v2/${query}` : "/registro-v2/");
    return;
  }
  res.redirect(`/registro.html${query}`);
});

/** Vercel puede entregar rutas /api sin el prefijo; restauramos el path esperado por Express. */
app.use((req, _res, next) => {
  const reqPath = req.path;
  const needsApiPrefix =
    reqPath.startsWith("/qr") ||
    reqPath.startsWith("/alerts") ||
    reqPath.startsWith("/chat") ||
    reqPath.startsWith("/auth") ||
    reqPath.startsWith("/pets") ||
    reqPath.startsWith("/owner");

  if (needsApiPrefix && !reqPath.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/pets", petsRouter);
app.use("/api/qr", qrRouter);
app.use("/api/chat", chatRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/owner", ownerRouter);

app.use(errorHandler);

export default app;

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    console.log(`Vista móvil (vecino): http://localhost:${PORT}/`);
    console.log(`War Room dueño: http://localhost:${PORT}/dashboard.html`);
  });
}
