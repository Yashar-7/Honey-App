import QRCode from "qrcode";
import { buildPetScanUrl } from "../lib/appUrl";
import { prisma } from "../lib/prisma";
import { resolveQrToken } from "../lib/qrToken";
import { AppError } from "../middleware/errorHandler";

/** ECC M: menos denso que H; módulos rellenos aptos para láser. */
const ECC: QRCode.QRCodeErrorCorrectionLevel = "M";
const QR_MARGIN_MODULES = 1;
const ENGRAVE_FILL = "#000000";

/** SVG con path relleno (sin strokes finos que el láser funde). */
function toFilledQrSvg(data: string): string {
  const qr = QRCode.create(data, { errorCorrectionLevel: ECC });
  const size = qr.modules.size;
  const margin = QR_MARGIN_MODULES;
  const dim = size + margin * 2;
  const parts: string[] = [];

  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!qr.modules.get(x, y)) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < size && qr.modules.get(x + w, y)) w += 1;
      parts.push(`M${x + margin} ${y + margin}h${w}v1h${-w}z`);
      x += w;
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">`,
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>`,
    `<path fill="${ENGRAVE_FILL}" d="${parts.join("")}"/>`,
    `</svg>`,
  ].join("");
}

export async function assertQrTokenExists(token: string) {
  const resolved = await resolveQrToken(token);

  if (resolved.status === "not_found") {
    throw new AppError(404, "Token QR no encontrado");
  }

  if (resolved.status === "deactivated") {
    throw new AppError(410, "Este código QR fue desactivado — rotá el token en la app");
  }

  const pet = await prisma.pet.findUnique({
    where: { id: resolved.petId },
    select: { id: true, name: true, qrToken: true, isActive: true },
  });

  if (!pet || !pet.isActive) {
    throw new AppError(404, "Mascota no encontrada o inactiva");
  }

  return pet;
}

export async function generateQrSvgForToken(
  token: string,
  req?: Parameters<typeof buildPetScanUrl>[1],
) {
  const pet = await assertQrTokenExists(token);
  const scanUrl = buildPetScanUrl(pet.qrToken, req);
  const svg = toFilledQrSvg(scanUrl);

  return {
    petId: pet.id,
    petName: pet.name,
    qrToken: pet.qrToken,
    scanUrl,
    svg,
  };
}

export function getQrSvgDownloadFilename(petName: string, qrToken: string): string {
  const safeName = petName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `honey-qr-${safeName || "mascota"}-${qrToken.slice(0, 8)}.svg`;
}
