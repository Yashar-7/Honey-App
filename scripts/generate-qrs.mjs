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
 * Salida:
 *   output/svgs/          — un SVG vectorial por serial (Corel / Illustrator)
 *   output/sheets/        — laminas A4 vectoriales 5x4 (recomendado para imprenta)
 *   output/honey-qr-stock.pdf — vista previa raster (no usar en Corel)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outputDir = path.join(root, "output");
const svgDir = path.join(outputDir, "svgs");
const sheetsDir = path.join(outputDir, "sheets");

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
/** Siempre produccion por defecto; solo override explicito con --base-url */
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
  margin: 1,
  width: 512,
  color: { dark: "#0f172a", light: "#ffffff" },
};

const PNG_OPTIONS = {
  type: "png",
  errorCorrectionLevel: "H",
  margin: 1,
  width: 512,
  color: { dark: "#0f172a", light: "#ffffff" },
};

/** A4 en puntos (pdf-lib) */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 28;
const COLS = 5;
const ROWS = 4;
const QRS_PER_PAGE = COLS * ROWS;

/** 2 cm minimo escaneable: 72 pt/pulgada, 2.54 cm/pulgada */
const PT_PER_CM = 72 / 2.54;
const MIN_QR_PT = 2 * PT_PER_CM;
const LABEL_SIZE = 11;
const LABEL_GAP = 6;

const GRID_W = PAGE.width - MARGIN * 2;
const GRID_H = PAGE.height - MARGIN * 2;
const CELL_W = GRID_W / COLS;
const CELL_H = GRID_H / ROWS;
const LABEL_BLOCK = LABEL_SIZE + LABEL_GAP + 4;
const QR_SIZE = Math.max(
  MIN_QR_PT,
  Math.min(CELL_W * 0.88, CELL_H - LABEL_BLOCK - 8),
);

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

async function generatePng(activationUrl) {
  return QRCode.toBuffer(activationUrl, PNG_OPTIONS);
}

function assertActivationUrl(serial, url) {
  const expected = buildActivationUrl(serial);
  if (url !== expected) {
    throw new Error(`URL invalida para ${serial}: ${url} (esperado: ${expected})`);
  }
}

/** Extrae paths internos del SVG generado por qrcode (100% vectorial). */
function extractSvgInner(svgString) {
  const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
  const parts = (viewBoxMatch?.[1] ?? "0 0 45 45").trim().split(/\s+/).map(Number);
  const vbW = parts[2] ?? 45;
  const vbH = parts[3] ?? 45;
  const inner = svgString
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  return { vbW, vbH, inner };
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Laminas A4 vectoriales (5x4) listas para Corel Draw / Illustrator. */
function buildVectorSheets(entries) {
  mkdirSync(sheetsDir, { recursive: true });

  const totalPages = Math.ceil(entries.length / QRS_PER_PAGE);
  const sheetPaths = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const slice = entries.slice(
      pageIndex * QRS_PER_PAGE,
      pageIndex * QRS_PER_PAGE + QRS_PER_PAGE,
    );

    const parts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${PAGE.width} ${PAGE.height}">`,
      `<rect width="100%" height="100%" fill="#ffffff"/>`,
    ];

    for (let i = 0; i < slice.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellLeft = MARGIN + col * CELL_W;
      const cellTop = MARGIN + row * CELL_H;

      const qrX = cellLeft + (CELL_W - QR_SIZE) / 2;
      const qrY = cellTop + (CELL_H - QR_SIZE - LABEL_BLOCK) / 2;

      const { vbW, vbH, inner } = extractSvgInner(slice[i].svg);
      const scale = QR_SIZE / Math.max(vbW, vbH);

      parts.push(
        `<g transform="translate(${qrX.toFixed(2)} ${qrY.toFixed(2)}) scale(${scale.toFixed(6)})">`,
        inner,
        "</g>",
      );

      const label = escapeXml(slice[i].serial);
      const textY = qrY + QR_SIZE + LABEL_GAP + LABEL_SIZE;
      parts.push(
        `<text x="${(cellLeft + CELL_W / 2).toFixed(2)}" y="${textY.toFixed(2)}" ` +
          `text-anchor="middle" font-family="Arial, Helvetica, sans-serif" ` +
          `font-size="${LABEL_SIZE}" font-weight="700" fill="#0f172a">${label}</text>`,
      );
    }

    parts.push("</svg>");

    const fileName = `honey-qr-sheet-${String(pageIndex + 1).padStart(2, "0")}.svg`;
    const filePath = path.join(sheetsDir, fileName);
    writeFileSync(filePath, parts.join("\n"), "utf8");
    sheetPaths.push(filePath);
  }

  return sheetPaths;
}

async function buildPdf(entries) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  const totalPages = Math.ceil(entries.length / QRS_PER_PAGE);
  const pages = Array.from({ length: totalPages }, () =>
    pdf.addPage([PAGE.width, PAGE.height]),
  );

  for (let i = 0; i < entries.length; i++) {
    const pageIndex = Math.floor(i / QRS_PER_PAGE);
    const indexOnPage = i % QRS_PER_PAGE;
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);
    const page = pages[pageIndex];

    const cellLeft = MARGIN + col * CELL_W;
    const cellTop = PAGE.height - MARGIN - row * CELL_H;

    const png = await generatePng(entries[i].url);
    const image = await pdf.embedPng(png);

    const qrX = cellLeft + (CELL_W - QR_SIZE) / 2;
    const qrY = cellTop - CELL_H + (CELL_H - QR_SIZE - LABEL_BLOCK) / 2 + LABEL_BLOCK;

    page.drawImage(image, {
      x: qrX,
      y: qrY,
      width: QR_SIZE,
      height: QR_SIZE,
    });

    const label = entries[i].serial;
    const labelWidth = font.widthOfTextAtSize(label, LABEL_SIZE);
    page.drawText(label, {
      x: cellLeft + (CELL_W - labelWidth) / 2,
      y: qrY - LABEL_GAP - LABEL_SIZE,
      size: LABEL_SIZE,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });
  }

  return pdf.save();
}

async function main() {
  console.log("\nHoney App - Generacion masiva de QRs");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Rango: ${formatSerial(START)} a ${formatSerial(START + COUNT - 1)}`);
  console.log(
    `   PDF: grilla ${COLS}x${ROWS} (${QRS_PER_PAGE}/pag), QR ${(QR_SIZE / PT_PER_CM).toFixed(1)} cm\n`,
  );

  const serials = Array.from({ length: COUNT }, (_, i) => formatSerial(START + i));
  const supabase = readSupabaseEnv();

  mkdirSync(svgDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  console.log("Insertando registros en Supabase QrStock…");
  const inserted = await seedQrStock(supabase, serials);
  console.log(`   OK ${inserted} filas nuevas/confirmadas en QrStock`);

  console.log("Generando SVGs y validando URLs…");
  const entries = [];
  for (const serial of serials) {
    const url = buildActivationUrl(serial);
    assertActivationUrl(serial, url);
    const svg = await generateSvg(url);
    const svgPath = path.join(svgDir, `${serial}.svg`);
    writeFileSync(svgPath, svg, "utf8");
    entries.push({ serial, url, svg });
  }

  console.log(`   OK ${entries.length} SVGs en ${svgDir}`);
  console.log(`   Ejemplo URL: ${entries[0].url}`);
  console.log(`   Ejemplo URL: ${entries[entries.length - 1].url}`);

  console.log("Generando laminas vectoriales SVG (Corel / imprenta)…");
  const sheetPaths = buildVectorSheets(entries);
  console.log(`   OK ${sheetPaths.length} laminas en ${sheetsDir}`);
  console.log("   Envia a la fabrica: output/sheets/*.svg (100% vectorial)");

  console.log("Compilando PDF raster (solo vista previa, no para Corel)…");
  const pdfBytes = await buildPdf(entries);
  const pdfPath = path.join(outputDir, "honey-qr-stock.pdf");
  writeFileSync(pdfPath, pdfBytes);

  const pageCount = Math.ceil(entries.length / QRS_PER_PAGE);
  console.log(`   OK PDF: ${pdfPath}`);
  console.log(`   Paginas PDF: ${pageCount} (${entries.length} QRs)`);
  console.log("\nListo para imprenta:");
  console.log(`   Vector (Corel 17): ${sheetsDir}`);
  console.log(`   Individual:        ${svgDir}`);
  console.log(`   Preview PDF:       ${pdfPath}\n`);
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
