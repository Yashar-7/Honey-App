import { isWithinRadiusKm } from "../lib/geo";
import { reverseGeocodeAddress } from "../lib/geocoding";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { resolveQrToken } from "../lib/qrToken";
import { notifyPetOwner } from "./push.service";

const DEFAULT_RADIUS_KM = 2;

export async function requestNeighborhoodHelp(input: {
  qrToken: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
}) {
  const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
  const resolved = await resolveQrToken(input.qrToken);

  if (resolved.status !== "active" || !resolved.isActive) {
    throw new AppError(410, "Este código QR no está activo");
  }

  const pet = await prisma.pet.findUnique({
    where: { id: resolved.petId },
    select: {
      id: true,
      name: true,
      userId: true,
      isLost: true,
    },
  });

  if (!pet) {
    throw new AppError(404, "Mascota no encontrada");
  }

  const { addressLabel } = await reverseGeocodeAddress(
    input.latitude,
    input.longitude,
  );

  console.log(
    `[neighborhood-help] Ayuda vecinal · ${pet.name} · ${addressLabel} (radio ${radiusKm} km)`,
  );

  const nearbyPets = await prisma.pet.findMany({
    where: {
      isActive: true,
      userId: { not: pet.userId },
      lastLat: { not: null },
      lastLng: { not: null },
    },
    select: {
      userId: true,
      lastLat: true,
      lastLng: true,
    },
  });

  const neighborUserIds = new Set<string>();

  for (const candidate of nearbyPets) {
    if (candidate.lastLat == null || candidate.lastLng == null) continue;
    if (
      isWithinRadiusKm(
        input.latitude,
        input.longitude,
        candidate.lastLat,
        candidate.lastLng,
        radiusKm,
      )
    ) {
      neighborUserIds.add(candidate.userId);
    }
  }

  let neighborsNotified = 0;
  let neighborPushSent = 0;

  for (const userId of neighborUserIds) {
    neighborsNotified += 1;
    const result = await notifyPetOwner(userId, {
      title: "🆘 Ayuda vecinal cerca tuyo",
      body: `Un vecino necesita ayuda con ${pet.name} cerca de ${addressLabel}. Abrí Honey App.`,
      url: `/escaneo?token=${encodeURIComponent(resolved.qrToken)}`,
      tag: `neighborhood-help-${pet.id}`,
      data: { type: "neighborhood_help", petId: pet.id, addressLabel },
    });
    neighborPushSent += result.sent ?? 0;
  }

  const ownerResult = await notifyPetOwner(pet.userId, {
    title: `🆘 Ayuda vecinal para ${pet.name}`,
    body: `Un vecino activó el protocolo de ayuda cercana en ${addressLabel}.`,
    url: "/dashboard",
    tag: `neighborhood-help-owner-${pet.id}`,
    data: { type: "neighborhood_help_owner", petId: pet.id, addressLabel },
  });

  return {
    success: true,
    petId: pet.id,
    petName: pet.name,
    addressLabel,
    radiusKm,
    neighborsNotified,
    neighborPushSent,
    ownerPushSent: ownerResult.sent ?? 0,
    message:
      neighborsNotified > 0
        ? `Alerta enviada a ${neighborsNotified} vecino(s) en un radio de ${radiusKm} km`
        : "Alerta registrada. Te avisamos al dueño; aún no hay vecinos con GPS cercano.",
  };
}
