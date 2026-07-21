import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { buildPetScanUrl, resolvePublicBaseUrl } from "../lib/appUrl";
import { prisma } from "../lib/prisma";
import { generateQrToken } from "../lib/tokens";
import { AppError } from "../middleware/errorHandler";
import type { CreatePetInput } from "../schemas/pet.schema";
import {
  assertStockSerialAvailable,
  isQrStockSoftFallbackEnabled,
  markStockSerialUsed,
  normalizeStockSerial,
  QrStockUnavailableError,
} from "./qrStock.service";

const VACCINATION_REMINDER_MONTHS = 12;
const DEWORMING_REMINDER_MONTHS = 3;
const REMINDER_WINDOW_DAYS = 30;

/** Calcula la próxima fecha de recordatorio según vacuna y desparasitación. */
export function computeNextReminderDate(
  lastVaccinationDate?: Date | null,
  lastDewormingDate?: Date | null,
): Date | null {
  const candidates: Date[] = [];

  if (lastVaccinationDate) {
    const next = new Date(lastVaccinationDate);
    next.setMonth(next.getMonth() + VACCINATION_REMINDER_MONTHS);
    candidates.push(next);
  }

  if (lastDewormingDate) {
    const next = new Date(lastDewormingDate);
    next.setMonth(next.getMonth() + DEWORMING_REMINDER_MONTHS);
    candidates.push(next);
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0];
}

const VACCINATION_REMINDER_SELECT = {
  id: true,
  name: true,
  species: true,
  nextReminderDate: true,
  lastVaccinationDate: true,
  lastDewormingDate: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  vetClinic: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} as const satisfies Prisma.PetSelect;

export type VaccinationReminderPet = Prisma.PetGetPayload<{
  select: typeof VACCINATION_REMINDER_SELECT;
}>;

/** Mascotas con recordatorio de vacuna/desparasitación en los próximos N días. */
export async function checkVaccinationReminders(
  withinDays = REMINDER_WINDOW_DAYS,
): Promise<VaccinationReminderPet[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + withinDays);
  end.setHours(23, 59, 59, 999);

  return prisma.pet.findMany({
    where: {
      isActive: true,
      nextReminderDate: {
        gte: start,
        lte: end,
      },
    },
    select: VACCINATION_REMINDER_SELECT,
    orderBy: { nextReminderDate: "asc" },
  });
}

async function assertVetClinicExists(vetClinicId?: string) {
  if (!vetClinicId) return;

  const clinic = await prisma.petShop.findFirst({
    where: { id: vetClinicId, isActive: true },
    select: { id: true, name: true },
  });

  if (!clinic) {
    throw new AppError(400, "La veterinaria o pet shop seleccionado no es válido");
  }
}

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
  lastVaccinationDate: true,
  lastDewormingDate: true,
  nextReminderDate: true,
  vetClinicId: true,
  vetClinic: {
    select: { id: true, name: true, type: true },
  },
} as const satisfies Prisma.PetSelect;

type CreatedPetWithHealth = Prisma.PetGetPayload<{
  select: typeof PET_CREATE_SELECT;
}>;

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
  stockSerial?: string,
): Prisma.PetUncheckedCreateInput {
  const nextReminderDate = computeNextReminderDate(
    input.lastVaccinationDate,
    input.lastDewormingDate,
  );

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
    stockSerial: stockSerial ?? null,
    vetClinicId: input.vetClinicId ?? null,
    lastVaccinationDate: input.lastVaccinationDate ?? null,
    lastDewormingDate: input.lastDewormingDate ?? null,
    nextReminderDate,
    ...buildPetMedicalData(input),
  };
}

export async function createPet(
  userId: string,
  input: CreatePetInput,
  options?: {
    photoUrl?: string;
    req?: Pick<Request, "get" | "protocol">;
    stockSerial?: string;
  },
) {
  await assertVetClinicExists(input.vetClinicId);

  const stockSerial = options?.stockSerial
    ? normalizeStockSerial(options.stockSerial)
    : input.stockSerial
      ? normalizeStockSerial(input.stockSerial)
      : null;

  if (stockSerial) {
    try {
      await assertStockSerialAvailable(stockSerial);
    } catch (err) {
      if (err instanceof QrStockUnavailableError && isQrStockSoftFallbackEnabled()) {
        console.warn(
          `[createPet] Soft-fallback: stock no disponible, se permite activar ${stockSerial}`,
        );
      } else {
        throw err;
      }
    }
  }

  const qrToken = generateQrToken();
  const nextReminderDate = computeNextReminderDate(
    input.lastVaccinationDate,
    input.lastDewormingDate,
  );

  let pet: CreatedPetWithHealth;
  pet = await prisma.pet.create({
    data: buildPetCreateData(userId, input, qrToken, options?.photoUrl, stockSerial ?? undefined),
    select: PET_CREATE_SELECT,
  });

  if (stockSerial) {
    try {
      await markStockSerialUsed(stockSerial);
    } catch (err) {
      if (err instanceof QrStockUnavailableError && isQrStockSoftFallbackEnabled()) {
        console.warn(
          `[createPet] Soft-fallback: Pet creada pero QrStock no marcado como usado (${stockSerial})`,
        );
      } else {
        await prisma.pet.delete({ where: { id: pet.id } }).catch(() => undefined);
        throw err;
      }
    }
  }

  const scanUrl = stockSerial
    ? `${resolvePublicBaseUrl(options?.req)}/activar?serial=${encodeURIComponent(stockSerial)}`
    : buildPetScanUrl(pet.qrToken, options?.req);

  return {
    message: stockSerial
      ? "Chapita activada correctamente. Tu mascota ya está protegida."
      : "Mascota registrada. El QR SVG está listo para enviar a la imprenta.",
    qrToken: pet.qrToken,
    stockSerial: stockSerial ?? null,
    pet,
    scanUrl,
    qrSvgUrl: `/api/qr/generate/${pet.qrToken}`,
    qrSvgDownloadUrl: `/api/qr/generate/${pet.qrToken}?download=1`,
    loyaltyReminder: nextReminderDate
      ? {
          nextReminderDate: nextReminderDate.toISOString(),
          vetClinicName: pet.vetClinic?.name ?? null,
        }
      : null,
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
