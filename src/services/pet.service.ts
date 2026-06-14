import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { buildPetScanUrl } from "../lib/appUrl";
import { prisma } from "../lib/prisma";
import { generateQrToken } from "../lib/tokens";
import { AppError } from "../middleware/errorHandler";
import type { CreatePetInput } from "../schemas/pet.schema";

/** Payload médico devuelto al registrar — independiente del caché del cliente Prisma. */
export type PetMedicalRecord = {
  medicalConditions: string | null;
  medications: string | null;
  allergies: string | null;
  behavioralNotes: string | null;
};

export type CreatedPetPayload = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  age: string | null;
  sex: string | null;
  size: string | null;
  color: string | null;
  distinguishingMarks: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  characteristics: string | null;
  finderMessage: string | null;
  photoUrl: string | null;
  qrToken: string;
  isActive: boolean;
  isLost: boolean;
  createdAt: Date;
} & PetMedicalRecord;

const PET_CREATE_SELECT = {
  id: true,
  name: true,
  species: true,
  breed: true,
  age: true,
  sex: true,
  size: true,
  color: true,
  distinguishingMarks: true,
  zipCode: true,
  neighborhood: true,
  characteristics: true,
  medicalConditions: true,
  medications: true,
  allergies: true,
  behavioralNotes: true,
  finderMessage: true,
  photoUrl: true,
  qrToken: true,
  isActive: true,
  isLost: true,
  createdAt: true,
} as const;

function buildCharacteristicsSummary(input: CreatePetInput): string | undefined {
  const parts = [
    input.medicalConditions,
    input.medications ? `Medicación: ${input.medications}` : null,
    input.allergies ? `Alergias: ${input.allergies}` : null,
    input.behavioralNotes ? `Comportamiento: ${input.behavioralNotes}` : null,
    input.characteristics,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function buildPetMedicalData(input: CreatePetInput): PetMedicalRecord {
  return {
    medicalConditions: input.medicalConditions ?? null,
    medications: input.medications ?? null,
    allergies: input.allergies ?? null,
    behavioralNotes: input.behavioralNotes ?? null,
  };
}

function buildPetCreateData(
  userId: string,
  input: CreatePetInput,
  qrToken: string,
  photoUrl?: string,
): Prisma.PetUncheckedCreateInput {
  return {
    userId,
    name: input.name,
    species: input.species,
    breed: input.breed,
    age: input.age,
    sex: input.sex,
    size: input.size,
    color: input.color,
    distinguishingMarks: input.distinguishingMarks,
    zipCode: input.zipCode,
    neighborhood: input.neighborhood,
    characteristics: buildCharacteristicsSummary(input),
    finderMessage: input.finderMessage,
    photoUrl,
    qrToken,
    ...buildPetMedicalData(input),
  } as Prisma.PetUncheckedCreateInput;
}

export async function createPet(
  userId: string,
  input: CreatePetInput,
  options?: { photoUrl?: string; req?: Pick<Request, "get" | "protocol"> },
) {
  const qrToken = generateQrToken();

  const pet = (await prisma.pet.create({
    data: buildPetCreateData(userId, input, qrToken, options?.photoUrl) as any,
    select: PET_CREATE_SELECT as any,
  })) as unknown as CreatedPetPayload;

  const scanUrl = buildPetScanUrl(pet.qrToken, options?.req);

  return {
    message:
      "Mascota registrada. El QR SVG está listo para enviar a la imprenta.",
    qrToken: pet.qrToken,
    pet,
    scanUrl,
    qrSvgUrl: `/api/qr/generate/${pet.qrToken}`,
    qrSvgDownloadUrl: `/api/qr/generate/${pet.qrToken}?download=1`,
  };
}

export async function rotatePetQrToken(
  petId: string,
  userId: string,
  req?: Pick<Request, "get" | "protocol">,
) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, userId },
    select: { id: true, qrToken: true, name: true },
  });

  if (!pet) {
    throw new AppError(404, "Mascota no encontrada");
  }

  const newQrToken = generateQrToken();

  const updatedPet = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.qrTokenHistory.create({
      data: {
        petId: pet.id,
        qrToken: pet.qrToken,
      },
    });

    return tx.pet.update({
      where: { id: pet.id },
      data: {
        qrToken: newQrToken,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        qrToken: true,
        isActive: true,
        updatedAt: true,
      },
    });
  });

  const scanUrl = buildPetScanUrl(updatedPet.qrToken, req);

  return {
    message:
      "Token QR rotado correctamente. La chapita anterior quedó desactivada.",
    pet: updatedPet,
    previousTokenDeactivated: true,
    scanUrl,
    qrSvgUrl: `/api/qr/generate/${updatedPet.qrToken}`,
    qrSvgDownloadUrl: `/api/qr/generate/${updatedPet.qrToken}?download=1`,
  };
}

export async function togglePetLostAlert(petId: string, userId: string) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, userId },
    select: { id: true, isLost: true, name: true },
  });

  if (!pet) {
    throw new AppError(404, "Mascota no encontrada");
  }

  const updatedPet = await prisma.pet.update({
    where: { id: pet.id },
    data: { isLost: !pet.isLost },
    select: {
      id: true,
      name: true,
      isLost: true,
      lastLat: true,
      lastLng: true,
      updatedAt: true,
    },
  });

  return {
    message: updatedPet.isLost
      ? "Modo Alerta activado — rastreo GPS habilitado"
      : "Modo Alerta desactivado",
    pet: updatedPet,
  };
}

/** Observaciones de salud unificadas (medicación, alergias, cuidados). */
export async function updatePetHealthObservations(
  petId: string,
  userId: string,
  healthObservations: string,
) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, userId },
    select: { id: true, name: true },
  });

  if (!pet) {
    throw new AppError(404, "Mascota no encontrada");
  }

  const trimmed = healthObservations.trim();

  const updated = await prisma.pet.update({
    where: { id: pet.id },
    data: { characteristics: trimmed || null },
    select: {
      id: true,
      name: true,
      characteristics: true,
      updatedAt: true,
    },
  });

  return {
    message: trimmed
      ? "Observaciones de salud guardadas"
      : "Observaciones de salud eliminadas",
    pet: updated,
  };
}
