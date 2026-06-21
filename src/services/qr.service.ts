import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  reverseGeocodeAddress,
} from "../lib/geocoding";
import {
  buildVisitorFingerprint,
  getContactSessionExpiry,
} from "../lib/contactSession";
import { resolveQrToken } from "../lib/qrToken";
import { AppError } from "../middleware/errorHandler";
import { CreateScanInput } from "../schemas/scan.schema";
import { appendLocationReferenceMessage } from "./chat.service";
import { notifyOwnerOfPetEvent } from "./ownerNotify.service";

export type QrVisitorMeta = {
  ipAddress?: string;
  userAgent?: string;
};

const SCAN_CREATE_SELECT = {
  id: true,
  latitude: true,
  longitude: true,
  accuracy: true,
  addressLabel: true,
  scannedAt: true,
} as const satisfies Prisma.ScanSelect;

const PUBLIC_PET_SELECT = {
  id: true,
  name: true,
  species: true,
  breed: true,
  age: true,
  sex: true,
  size: true,
  color: true,
  distinguishingMarks: true,
  characteristics: true,
  medicalConditions: true,
  medications: true,
  allergies: true,
  behavioralNotes: true,
  finderMessage: true,
  photoUrl: true,
  isActive: true,
} as const;

async function resolveOrCreateContactSession(
  petId: string,
  qrToken: string,
  visitor?: QrVisitorMeta,
) {
  const visitorFingerprint = buildVisitorFingerprint(
    visitor?.ipAddress,
    visitor?.userAgent,
  );
  const now = new Date();

  const existing = await prisma.contactSession.findFirst({
    where: {
      petId,
      status: "open",
      visitorFingerprint,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, expiresAt: true },
  });

  if (existing) {
    return { ...existing, isNew: false };
  }

  const created = await prisma.contactSession.create({
    data: {
      petId,
      qrToken,
      visitorFingerprint,
      expiresAt: getContactSessionExpiry(),
    },
    select: { id: true, expiresAt: true },
  });

  return { ...created, isNew: true };
}

export async function getPetByQrToken(
  token: string,
  visitor?: QrVisitorMeta,
) {
  const resolved = await resolveQrToken(token);

  if (resolved.status === "not_found") {
    throw new AppError(404, "Token QR no encontrado");
  }

  if (resolved.status === "deactivated") {
    throw new AppError(410, "Este código QR fue desactivado");
  }

  if (!resolved.isActive) {
    throw new AppError(410, "Este código QR fue desactivado");
  }

  const pet = await prisma.pet.findUnique({
    where: { id: resolved.petId },
    select: {
      ...PUBLIC_PET_SELECT,
      userId: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!pet) {
    throw new AppError(404, "Token QR no encontrado");
  }

  const contactSession = await resolveOrCreateContactSession(
    pet.id,
    resolved.qrToken,
    visitor,
  );

  if (contactSession.isNew) {
    void notifyOwnerOfPetEvent(pet.userId, {
      type: "qr_open",
      petId: pet.id,
      sessionId: contactSession.id,
      petName: pet.name,
      body: "Un vecino escaneó el QR de tu mascota",
    });
  }

  const { user, userId: _ownerId, ...petData } = pet;

  return {
    pet: petData,
    contact: {
      ownerName: user.name,
      sessionId: contactSession.id,
      expiresAt: contactSession.expiresAt,
    },
  };
}

export async function registerScan(
  token: string,
  input: CreateScanInput,
  meta: { ipAddress?: string; userAgent?: string; sessionId?: string },
) {
  const resolved = await resolveQrToken(token);

  if (resolved.status === "not_found") {
    throw new AppError(404, "Token QR no encontrado");
  }

  if (resolved.status === "deactivated") {
    throw new AppError(410, "Este código QR fue desactivado");
  }

  if (!resolved.isActive) {
    throw new AppError(410, "Este código QR fue desactivado");
  }

  const pet = await prisma.pet.findUnique({
    where: { id: resolved.petId },
    select: { id: true, name: true, userId: true },
  });

  if (!pet) {
    throw new AppError(404, "Token QR no encontrado");
  }

  const { addressLabel, fromGeocoder, debug: geocodeDebug } = await reverseGeocodeAddress(
    input.latitude,
    input.longitude,
  );

  const scan = await prisma.$transaction(async (tx) => {
    const createdScan = await tx.scan.create({
      data: {
        petId: pet.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        addressLabel,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      select: SCAN_CREATE_SELECT,
    });

    await tx.pet.update({
      where: { id: pet.id },
      data: {
        lastLat: input.latitude,
        lastLng: input.longitude,
      },
    });

    return createdScan;
  });

  console.log(`[scan] GPS registrado · petId=${pet.id}`);

  if (meta.sessionId) {
    await appendLocationReferenceMessage(meta.sessionId, addressLabel);
  }

  const ownerBody = addressLabel.startsWith("Ubicación exacta no disponible")
    ? `Un vecino compartió la ubicación de ${pet.name}: ${addressLabel}`
    : `¡${pet.name} fue encontrada! Está cerca de ${addressLabel}.`;

  void notifyOwnerOfPetEvent(pet.userId, {
    type: "gps_scan",
    petId: pet.id,
    petName: pet.name,
    sessionId: meta.sessionId,
    addressLabel,
    body: ownerBody,
    autoOpenChat: true,
  });

  return {
    message: "Escaneo registrado correctamente",
    petName: pet.name,
    addressLabel,
    fromGeocoder,
    ...(geocodeDebug ? { geocodeDebug } : {}),
    scan,
    petLocation: {
      lastLat: input.latitude,
      lastLng: input.longitude,
      addressLabel,
    },
  };
}
