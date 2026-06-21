/**
 * QA smoke test — Honey App (producción / staging)
 * Uso: QR_TOKEN=tu-token-real node scripts/qa-smoke.mjs [BASE_URL]
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const BASE =
  process.argv[2]?.replace(/\/$/, "") ||
  process.env.BASE_URL?.trim() ||
  "http://localhost:3000";

const QR_TOKEN = process.env.QR_TOKEN?.trim() || "";

const results = [];

function pass(name, detail = "") {
  results.push({ status: "PASS", name, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ status: "FAIL", name, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name, detail = "") {
  results.push({ status: "WARN", name, detail });
  console.log(`⚠️  ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, detail = "") {
  results.push({ status: "SKIP", name, detail });
  console.log(`⏭️  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { res, body };
}

async function testStaticAssets() {
  const files = [
    "public/index.html",
    "public/registro/index.html",
    "public/dashboard.html",
    "public/escaneo.html",
    "public/login.html",
    "public/assets/honey-app-logo.png",
    "public/assets/hero-mascota-qr.png",
    "public/js/supabase-client.js",
  ];
  for (const f of files) {
    const full = path.join(root, f);
    if (existsSync(full)) pass(`Asset local: ${f}`);
    else fail(`Asset local: ${f}`, "no existe");
  }
}

async function testHttp(base) {
  console.log(`\n── HTTP QA @ ${base} ──\n`);

  try {
    const health = await fetchJson(`${base}/health`);
    if (health.res.ok && health.body?.status === "ok") pass("GET /health");
    else fail("GET /health", `HTTP ${health.res.status}`);
  } catch (err) {
    fail("GET /health", err.message);
    return;
  }

  for (const p of ["/", "/login", "/registro/", "/dashboard", "/escaneo"]) {
    try {
      const res = await fetch(`${base}${p}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) pass(`GET ${p}`, `HTTP ${res.status}`);
      else fail(`GET ${p}`, `HTTP ${res.status}`);
    } catch (err) {
      fail(`GET ${p}`, err.message);
    }
  }

  if (!QR_TOKEN) {
    skip("GET /api/qr/:token", "definí QR_TOKEN con un token real");
    skip("POST /api/alerts + geocoding", "definí QR_TOKEN con un token real");
  } else {
    try {
      const qr = await fetchJson(`${base}/api/qr/${QR_TOKEN}`);
      if (qr.res.ok && qr.body?.pet?.name) {
        pass("GET /api/qr/:token", qr.body.pet.name);
      } else {
        fail("GET /api/qr/:token", `HTTP ${qr.res.status}`);
      }
    } catch (err) {
      fail("GET /api/qr/:token", err.message);
    }

    try {
      const alert = await fetchJson(`${base}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: QR_TOKEN,
          latitude: -38.0055,
          longitude: -57.5426,
          accuracy: 12,
        }),
      });
      if (alert.res.status === 201) {
        const label = alert.body?.addressLabel || "";
        if (label && !label.startsWith("Ubicación exacta no disponible")) {
          pass("POST /api/alerts + geocoding", label);
        } else if (label) {
          fail("POST /api/alerts + geocoding", label);
        } else {
          warn("POST /api/alerts", "201 sin addressLabel");
        }
      } else {
        fail("POST /api/alerts", `HTTP ${alert.res.status}`);
      }
    } catch (err) {
      fail("POST /api/alerts", err.message);
    }
  }

  try {
    const vapid = await fetchJson(`${base}/api/owner/push/vapid-public-key`);
    if (vapid.res.ok && vapid.body?.publicKey) pass("GET /api/owner/push/vapid-public-key");
    else fail("GET /api/owner/push/vapid-public-key", `HTTP ${vapid.res.status}`);
  } catch (err) {
    fail("GET /api/owner/push/vapid-public-key", err.message);
  }
}

async function main() {
  console.log("Honey App — QA smoke test\n");
  await testStaticAssets();
  await testHttp(BASE);

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const warned = results.filter((r) => r.status === "WARN").length;

  console.log(`\n── Resumen: ${passed} OK · ${failed} FAIL · ${warned} WARN ──\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
