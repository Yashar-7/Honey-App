/**
 * Genera stock de chapas QR para láser (Punto Láser / Corel).
 *
 * Producción industrial (Ø30 mm corte / QR ≤18 mm útil):
 *   - URL corta /s/{código} (≤8 chars) → QR de baja versión, módulos grandes
 *   - Error Correction Level L → mínima densidad de puntos
 *   - SVG individual: círculo de corte Ø30 mm + QR centrado + serial Arial Bold
 *
 * Uso:
 *   node scripts/generate-qrs.mjs
 *   node scripts/generate-qrs.mjs --count 50 --start 1
 *   node scripts/generate-qrs.mjs --base-url https://otro-dominio.app
 *
 * Base URL por defecto: https://honey-app-gamma.vercel.app
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Salida:
 *   output/svgs/          — un SVG chapita Ø30 mm por serial (láser / Corel)
 *   output/sheets/        — láminas A4 vectoriales 5×4
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

/** Plano técnico Punto Láser (mm) */
const OUTER_DIAMETER_MM = 30;
const QR_MAX_DIAMETER_MM = 18;
const LABEL_FONT_MM = 2.4;
const LABEL_GAP_MM = 0.7;
/** Hairline de corte (rojo = capa CUT en láser) */
const CUT_STROKE = "#FF0000";
const CUT_STROKE_WIDTH_MM = 0.05;
const ENGRAVE_FILL = "#000000";

const args = process.argv.slice(2);
function readArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
}

const COUNT = Number(readArg("--count", "50"));
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

/**
 * Código corto alfanumérico (máx. 8 chars) a partir del serial.
 * HNY-001 → "000001"  |  HNY-050 → "00001e" (base36, pad 6)
 */
function serialToShortCode(serial) {
  const n = Number(String(serial).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 999) {
    throw new Error(`Serial fuera de rango para código corto: ${serial}`);
  }
  return n.toString(36).padStart(6, "0");
}

/** URL mínima para baja versión de QR (módulos grandes en 18 mm). */
function buildActivationUrl(serial) {
  const code = serialToShortCode(serial);
  if (code.length > 8) {
    throw new Error(`Código corto demasiado largo (${code.length}): ${code}`);
  }
  return `${BASE_URL}/s/${code}`;
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

/** Quiet zone en módulos (ECC L + margen mínimo para legibilidad). */
const QR_MARGIN_MODULES = 1;

const PNG_OPTIONS = {
  type: "png",
  errorCorrectionLevel: "L",
  margin: QR_MARGIN_MODULES,
  width: 512,
  color: { dark: ENGRAVE_FILL, light: "#ffffff" },
};

/** A4 en puntos (pdf-lib) */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 28;
const COLS = 5;
const ROWS = 4;
const QRS_PER_PAGE = COLS * ROWS;

const PT_PER_MM = 72 / 25.4;
const BADGE_PT = OUTER_DIAMETER_MM * PT_PER_MM;
const LABEL_SIZE = 11;
const LABEL_GAP = 6;

const GRID_W = PAGE.width - MARGIN * 2;
const GRID_H = PAGE.height - MARGIN * 2;
const CELL_W = GRID_W / COLS;
const CELL_H = GRID_H / ROWS;
const LABEL_BLOCK = LABEL_SIZE + LABEL_GAP + 4;
const QR_SIZE = Math.min(BADGE_PT, Math.min(CELL_W * 0.88, CELL_H - LABEL_BLOCK - 8));

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

async function generatePng(activationUrl) {
  return QRCode.toBuffer(activationUrl, PNG_OPTIONS);
}

/**
 * QR 100% relleno (rects sólidos) — NO usar SVG stroke de `qrcode.toString`,
 * porque el láser funde trazos finos y el celular no lee el código.
 */
function buildFilledQrModules(activationUrl) {
  const qr = QRCode.create(activationUrl, { errorCorrectionLevel: "L" });
  const size = qr.modules.size;
  const margin = QR_MARGIN_MODULES;
  const dim = size + margin * 2;
  const version = (size - 21) / 4 + 1;

  // Fusionar runs horizontales → menos nodos, grabado más limpio
  const pathParts = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!qr.modules.get(x, y)) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < size && qr.modules.get(x + w, y)) w += 1;
      pathParts.push(`M${x + margin} ${y + margin}h${w}v1h${-w}z`);
      x += w;
    }
  }

  const inner =
    `<rect width="${dim}" height="${dim}" fill="#FFFFFF"/>` +
    `<path fill="${ENGRAVE_FILL}" d="${pathParts.join("")}"/>`;

  return {
    vbW: dim,
    vbH: dim,
    inner,
    modules: size,
    version,
    moduleMm: QR_MAX_DIAMETER_MM / dim,
  };
}

function assertActivationUrl(serial, url) {
  const expected = buildActivationUrl(serial);
  if (url !== expected) {
    throw new Error(`URL inválida para ${serial}: ${url} (esperado: ${expected})`);
  }
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Chapita lista para láser:
 *  - Círculo de corte exterior Ø30 mm
 *  - QR relleno centrado, lado = Ø18 mm máx.
 *  - Serial "HNY-XXX" en Arial/Helvetica Bold debajo
 */
function buildChapitaSvg(serial, qrModules) {
  const R = OUTER_DIAMETER_MM / 2;
  const qrSize = QR_MAX_DIAMETER_MM;
  const { vbW, vbH, inner } = qrModules;
  const scale = qrSize / Math.max(vbW, vbH);

  // QR arriba del centro para dejar banda inferior al serial
  const stackH = qrSize + LABEL_GAP_MM + LABEL_FONT_MM;
  const stackTop = (OUTER_DIAMETER_MM - stackH) / 2;
  const qrX = R - qrSize / 2;
  const qrY = stackTop;
  const labelY = qrY + qrSize + LABEL_GAP_MM + LABEL_FONT_MM * 0.85;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTER_DIAMETER_MM}mm" height="${OUTER_DIAMETER_MM}mm" viewBox="0 0 ${OUTER_DIAMETER_MM} ${OUTER_DIAMETER_MM}">`,
    `  <!-- CUT: círculo exterior Ø${OUTER_DIAMETER_MM} mm -->`,
    `  <circle cx="${R}" cy="${R}" r="${R}" fill="none" stroke="${CUT_STROKE}" stroke-width="${CUT_STROKE_WIDTH_MM}"/>`,
    `  <!-- ENGRAVE: fondo blanco + QR ≤${QR_MAX_DIAMETER_MM} mm + serial -->`,
    `  <circle cx="${R}" cy="${R}" r="${(R - CUT_STROKE_WIDTH_MM).toFixed(3)}" fill="#FFFFFF"/>`,
    `  <g transform="translate(${qrX.toFixed(4)} ${qrY.toFixed(4)}) scale(${scale.toFixed(8)})">`,
    `    ${inner}`,
    `  </g>`,
    `  <text x="${R}" y="${labelY.toFixed(3)}" text-anchor="middle"`,
    `    font-family="Arial, Helvetica, sans-serif" font-size="${LABEL_FONT_MM}"`,
    `    font-weight="700" fill="${ENGRAVE_FILL}">${escapeXml(serial)}</text>`,
    `</svg>`,
    ``,
  ].join("\n");
}

/** Láminas A4 vectoriales (5×4) con chapitas Ø30 mm. */
function buildVectorSheets(entries) {
  mkdirSync(sheetsDir, { recursive: true });

  const totalPages = Math.ceil(entries.length / QRS_PER_PAGE);
  const sheetPaths = [];
  const badgeSize = Math.min(CELL_W * 0.9, CELL_H * 0.9, BADGE_PT * 1.15);
  const badgeScale = badgeSize / OUTER_DIAMETER_MM;

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
      const badgeX = cellLeft + (CELL_W - badgeSize) / 2;
      const badgeY = cellTop + (CELL_H - badgeSize) / 2;

      const chapitaInner = slice[i].chapitaSvg
        .replace(/^[\s\S]*?<svg[^>]*>/i, "")
        .replace(/<\/svg>\s*$/i, "")
        .trim();

      parts.push(
        `<g transform="translate(${badgeX.toFixed(2)} ${badgeY.toFixed(2)}) scale(${badgeScale.toFixed(6)})">`,
        chapitaInner,
        "</g>",
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
      color: rgb(0, 0, 0),
    });
  }

  return pdf.save();
}

async function main() {
  console.log("\nHoney App — Generación industrial de chapitas QR (láser)");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Rango: ${formatSerial(START)} a ${formatSerial(START + COUNT - 1)}`);
  console.log(`   Geometría: corte Ø${OUTER_DIAMETER_MM} mm · QR ≤ Ø${QR_MAX_DIAMETER_MM} mm`);
  console.log(`   QR: ECC=L (baja densidad) · URL corta /s/{código≤8}`);
  console.log(
    `   PDF preview: grilla ${COLS}×${ROWS} (${QRS_PER_PAGE}/pág)\n`,
  );

  const serials = Array.from({ length: COUNT }, (_, i) => formatSerial(START + i));
  const supabase = readSupabaseEnv();

  mkdirSync(svgDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  console.log("Insertando registros en Supabase QrStock…");
  const inserted = await seedQrStock(supabase, serials);
  console.log(`   OK ${inserted} filas nuevas/confirmadas en QrStock`);

  console.log("Generando SVGs chapita (vectorial relleno, baja densidad)…");
  const entries = [];
  let worst = { modules: 0, version: 0, moduleMm: Infinity, serial: "" };

  for (const serial of serials) {
    const url = buildActivationUrl(serial);
    assertActivationUrl(serial, url);

    const qrModules = buildFilledQrModules(url);
    if (qrModules.modules > worst.modules) {
      worst = {
        modules: qrModules.modules,
        version: qrModules.version,
        moduleMm: qrModules.moduleMm,
        serial,
      };
    }

    const chapitaSvg = buildChapitaSvg(serial, qrModules);
    const svgPath = path.join(svgDir, `${serial}.svg`);
    writeFileSync(svgPath, chapitaSvg, "utf8");
    entries.push({ serial, url, chapitaSvg, density: qrModules });
  }

  console.log(`   OK ${entries.length} SVGs en ${svgDir}`);
  console.log(`   Ejemplo URL: ${entries[0].url}`);
  console.log(`   Ejemplo URL: ${entries[entries.length - 1].url}`);
  console.log(
    `   Densidad máx: ${worst.serial} → QR v${worst.version} (${worst.modules}×${worst.modules}) · módulo ≈ ${worst.moduleMm.toFixed(3)} mm`,
  );
  if (worst.moduleMm < 0.5) {
    console.warn(
      "   ⚠ Módulo < 0.5 mm: riesgo de fusión láser. Considerá dominio más corto o menos datos.",
    );
  } else {
    console.log("   Densidad OK para grabado láser en Ø18 mm");
  }

  console.log("Generando láminas vectoriales SVG (Corel / imprenta)…");
  const sheetPaths = buildVectorSheets(entries);
  console.log(`   OK ${sheetPaths.length} láminas en ${sheetsDir}`);
  console.log("   Enviá a fábrica: output/svgs/*.svg y output/sheets/*.svg");

  console.log("Compilando PDF raster (solo vista previa, no para Corel)…");
  const pdfBytes = await buildPdf(entries);
  const pdfPath = path.join(outputDir, "honey-qr-stock.pdf");
  writeFileSync(pdfPath, pdfBytes);

  const pageCount = Math.ceil(entries.length / QRS_PER_PAGE);
  console.log(`   OK PDF: ${pdfPath}`);
  console.log(`   Páginas PDF: ${pageCount} (${entries.length} QRs)`);
  console.log("\nListo para láser / imprenta:");
  console.log(`   Chapitas Ø30 mm:  ${svgDir}`);
  console.log(`   Láminas A4:       ${sheetsDir}`);
  console.log(`   Preview PDF:      ${pdfPath}\n`);
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
