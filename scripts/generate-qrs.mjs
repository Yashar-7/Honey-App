/**
 * Genera stock de 100 chapas QR (HNY-001 … HNY-100) en Supabase QrStock
 * y exporta un PDF listo para imprenta.
 *
 * Uso:
 *   node scripts/generate-qrs.mjs
 *   node scripts/generate-qrs.mjs --count 100 --start 1
 *   node scripts/generate-qrs.mjs --base-url https://otro-dominio.app  # override opcional
 *
 * Base URL por defecto: https://honey-app-gamma.vercel.app (no usa BASE_URL del .env).
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Salida: output/honey-qr-stock.pdf + output/svgs/
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outputDir = path.join(root, "output");
const svgDir = path.join(outputDir, "svgs");

const DEFAULT_BASE_URL = "https://honey-app-gamma.vercel.app";
const QR_STOCK_TABLE = "QrStock";

const args = process.argv.slice(2);
function readArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
}

const COUNT = Number(readArg("--count", "100"));
const START = Number(readArg("--start", "1"));
/** Siempre producción por defecto; solo override explícito con --base-url */
const BASE_URL = readArg("--base-url", DEFAULT_BASE_URL).replace(/\/$/, "");

if (!Number.isFinite(COUNT) || COUNT < 1 || COUNT > 10000) {
  console.error("❌ --count debe ser un entero entre 1 y 10000");
  process.exit(1);
}

function formatSerial(n) {
  return `HNY-${String(n).padStart(3, "0")}`;
}

function buildActivationUrl(serial) {
  return `${BASE_URL}/activar?serial=${encodeURIComponent(serial)}`;
}

function readSupabaseEnv() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("❌ Configurá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SVG_OPTIONS = {
  type: "svg",
  errorCorrectionLevel: "H",
  margin: 2,
  width: 512,
  color: { dark: "#0f172a", light: "#ffffff" },
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 36;
const COLS = 5;
const ROWS = 4;
const CELL_W = (PAGE.width - MARGIN * 2) / COLS;
const CELL_H = (PAGE.height - MARGIN * 2) / ROWS;
const QR_SIZE = Math.min(CELL_W * 0.72, CELL_H * 0.62);
const LABEL_SIZE = 11;

async function seedQrStock(supabase, serials) {
  const rows = serials.map((serial) => ({
    serial,
    isUsed: false,
    createdAt: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from(QR_STOCK_TABLE)
    .upsert(rows, { onConflict: "serial", ignoreDuplicates: true })
    .select("serial");

  if (error) {
    throw new Error(`Supabase upsert falló: ${error.message}`);
  }

  return data?.length ?? rows.length;
}

async function generateSvg(activationUrl) {
  return QRCode.toString(activationUrl, SVG_OPTIONS);
}

async function svgToPng(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function buildPdf(entries) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const perPage = COLS * ROWS;
  let page = pdf.addPage([PAGE.width, PAGE.height]);

  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && i % perPage === 0) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
    }

    const indexOnPage = i % perPage;
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);

    const cellX = MARGIN + col * CELL_W;
    const cellY = PAGE.height - MARGIN - (row + 1) * CELL_H;

    const png = await svgToPng(entries[i].svg);
    const image = await pdf.embedPng(png);

    const qrX = cellX + (CELL_W - QR_SIZE) / 2;
    const qrY = cellY + CELL_H * 0.28;

    page.drawImage(image, {
      x: qrX,
      y: qrY,
      width: QR_SIZE,
      height: QR_SIZE,
    });

    const label = entries[i].serial;
    const labelWidth = font.widthOfTextAtSize(label, LABEL_SIZE);
    page.drawText(label, {
      x: cellX + (CELL_W - labelWidth) / 2,
      y: qrY - 16,
      size: LABEL_SIZE,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });

    const sub = "Honey App";
    const subWidth = fontRegular.widthOfTextAtSize(sub, 8);
    page.drawText(sub, {
      x: cellX + (CELL_W - subWidth) / 2,
      y: qrY - 28,
      size: 8,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.48),
    });
  }

  const cover = pdf.insertPage(0, [PAGE.width, PAGE.height]);
  cover.drawText("Honey App - Lote de chapas QR", {
    x: MARGIN,
    y: PAGE.height - MARGIN - 24,
    size: 20,
    font,
    color: rgb(0.06, 0.09, 0.16),
  });
  cover.drawText(`Seriales: ${entries[0].serial} a ${entries[entries.length - 1].serial}`, {
    x: MARGIN,
    y: PAGE.height - MARGIN - 52,
    size: 12,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.33),
  });
  cover.drawText(`Destino: ${BASE_URL}/activar?serial=HNY-XXX`, {
    x: MARGIN,
    y: PAGE.height - MARGIN - 72,
    size: 11,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.33),
  });
  cover.drawText(`Generado: ${new Date().toISOString()}`, {
    x: MARGIN,
    y: PAGE.height - MARGIN - 92,
    size: 10,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.58),
  });

  return pdf.save();
}

async function main() {
  console.log("\n🍯 Honey App — Generación masiva de QRs");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Rango: ${formatSerial(START)} … ${formatSerial(START + COUNT - 1)}\n`);

  const serials = Array.from({ length: COUNT }, (_, i) => formatSerial(START + i));
  const supabase = readSupabaseEnv();

  mkdirSync(svgDir, { recursive: true });

  console.log("📦 Insertando registros en Supabase QrStock…");
  const inserted = await seedQrStock(supabase, serials);
  console.log(`   ✓ ${inserted} filas en QrStock`);

  console.log("🎨 Generando SVGs…");
  const entries = [];
  for (const serial of serials) {
    const url = buildActivationUrl(serial);
    const svg = await generateSvg(url);
    const svgPath = path.join(svgDir, `${serial}.svg`);
    writeFileSync(svgPath, svg, "utf8");
    entries.push({ serial, url, svg });
  }
  console.log(`   ✓ ${entries.length} SVGs en ${svgDir}`);

  console.log("📄 Compilando PDF para imprenta…");
  const pdfBytes = await buildPdf(entries);
  const pdfPath = path.join(outputDir, "honey-qr-stock.pdf");
  writeFileSync(pdfPath, pdfBytes);
  console.log(`   ✓ PDF: ${pdfPath}`);

  console.log("\n✅ Listo. Enviá el PDF a la imprenta.\n");
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
