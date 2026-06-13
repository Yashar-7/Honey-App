import QRCode from "qrcode";
import { buildPetScanUrl } from "../lib/appUrl";
import { prisma } from "../lib/prisma";
import { resolveQrToken } from "../lib/qrToken";
import { AppError } from "../middleware/errorHandler";

const SVG_OPTIONS: QRCode.QRCodeToStringOptions = {
  type: "svg",
  errorCorrectionLevel: "H",
  margin: 2,
  width: 300,
  color: {
    dark: "#0f172a",
    light: "#ffffff",
  },
};

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
  const svg = await QRCode.toString(scanUrl, SVG_OPTIONS);

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
