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
import { petShopsRouter } from "./routes/petShops.routes";
import { qrRouter } from "./routes/qr.routes";
import { qrStockRouter } from "./routes/qrStock.routes";
import { prisma } from "./lib/prisma";
import {
  isQrStockSoftFallbackEnabled,
  lookupQrStock,
  normalizeStockSerial,
  QrStockUnavailableError,
} from "./services/qrStock.service";

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const publicDir = path.join(__dirname, "..", "public");

function sendPublicPage(res: express.Response, fileName: string) {
  res.sendFile(path.join(publicDir, fileName));
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "honey-app",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  if (req.query.token) {
    sendPublicPage(res, "escaneo.html");
    return;
  }
  const landingIndex = path.join(publicDir, "index.html");
  if (existsSync(landingIndex)) {
    res.sendFile(landingIndex);
    return;
  }
  sendPublicPage(res, "escaneo.html");
});

app.get("/escaneo", (_req, res) => {
  sendPublicPage(res, "escaneo.html");
});

app.get("/login", (_req, res) => {
  sendPublicPage(res, "login.html");
});

app.get("/dashboard", (_req, res) => {
  sendPublicPage(res, "dashboard.html");
});

app.get("/cuenta", (_req, res) => {
  sendPublicPage(res, "cuenta.html");
});

app.get(["/registro", "/registro/"], (_req, res) => {
  const registroIndex = path.join(publicDir, "registro", "index.html");
  if (existsSync(registroIndex)) {
    res.sendFile(registroIndex);
    return;
  }
  sendPublicPage(res, "registro.html");
});

app.get("/login.html", (_req, res) => {
  res.redirect(301, "/login");
});

app.get("/dashboard.html", (_req, res) => {
  res.redirect(301, "/dashboard");
});

app.get("/cuenta.html", (_req, res) => {
  res.redirect(301, "/cuenta");
});

app.get(["/registro-v2", "/registro-v2/"], (req, res) => {
  const queryStart = req.url.indexOf("?");
  const query = queryStart >= 0 ? req.url.slice(queryStart) : "";
  res.redirect(301, query ? `/registro${query}` : "/registro");
});

/**
 * Activación de chapita física preimpresa (?serial=HNY-001).
 * - Disponible → registro de mascota
 * - Ya activada → escaneo vecino (redirige al token de la mascota)
 * - Stock caído → pantalla amigable (o soft-fallback a registro)
 */
app.get("/activar", async (req, res) => {
  const rawSerial = req.query.serial;
  const serial = normalizeStockSerial(
    Array.isArray(rawSerial) ? rawSerial[0] : rawSerial,
  );

  if (!serial) {
    sendPublicPage(res, "activar.html");
    return;
  }

  // Camino rápido vía Neon: chapita ya vinculada (no depende de Supabase).
  try {
    const existingPet = await prisma.pet.findFirst({
      where: { stockSerial: serial, isActive: true },
      select: { qrToken: true },
    });
    if (existingPet) {
      res.redirect(`/?token=${encodeURIComponent(existingPet.qrToken)}`);
      return;
    }
  } catch (err) {
    console.error("[activar] Neon lookup falló:", err);
  }

  try {
    const stock = await lookupQrStock(serial);
    if (!stock) {
      res.redirect(`/activar?error=invalid&serial=${encodeURIComponent(serial)}`);
      return;
    }

    if (!stock.isUsed) {
      res.redirect(
        `/registro?serial=${encodeURIComponent(serial)}&modo=registro`,
      );
      return;
    }

    res.redirect(`/activar?error=orphan&serial=${encodeURIComponent(serial)}`);
  } catch (err) {
    if (err instanceof QrStockUnavailableError) {
      console.error("[activar] QrStock unavailable:", err.message);
      if (isQrStockSoftFallbackEnabled()) {
        res.redirect(
          `/registro?serial=${encodeURIComponent(serial)}&modo=registro&offline=1`,
        );
        return;
      }
      res.redirect(
        `/activar?error=unavailable&serial=${encodeURIComponent(serial)}`,
      );
      return;
    }

    console.error("[activar] error inesperado:", err);
    res.redirect(
      `/activar?error=unavailable&serial=${encodeURIComponent(serial)}`,
    );
  }
});

app.use(express.static(publicDir));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

/** Vercel puede entregar rutas /api sin el prefijo; restauramos el path esperado por Express. */
app.use((req, _res, next) => {
  const reqPath = req.path;
  const needsApiPrefix =
    reqPath.startsWith("/qr") ||
    reqPath.startsWith("/qr-stock") ||
    reqPath.startsWith("/alerts") ||
    reqPath.startsWith("/chat") ||
    reqPath.startsWith("/auth") ||
    reqPath.startsWith("/pets") ||
    reqPath.startsWith("/pet-shops") ||
    reqPath.startsWith("/owner");

  if (needsApiPrefix && !reqPath.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/pets", petsRouter);
app.use("/api/pet-shops", petShopsRouter);
app.use("/api/qr", qrRouter);
app.use("/api/qr-stock", qrStockRouter);
app.use("/api/chat", chatRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/owner", ownerRouter);

app.use(errorHandler);

export default app;

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
    console.log(`Landing: http://localhost:${PORT}/`);
    console.log(`Vista vecino (escaneo): http://localhost:${PORT}/escaneo`);
    console.log(`War Room dueño: http://localhost:${PORT}/dashboard`);
  });
}
