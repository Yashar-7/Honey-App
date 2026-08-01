import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

const WHATSAPP_RE = /^\+?[0-9\s()-]{8,20}$/;

export const communityAlertFreeSchema = z.object({
  species: z.enum(["perro", "gato"], {
    errorMap: () => ({ message: "Elegí perro o gato" }),
  }),
  zone: z.string().trim().min(2, "Indicá la zona").max(80),
  whatsapp: z
    .string()
    .trim()
    .regex(WHATSAPP_RE, "WhatsApp inválido (solo números, 8–20 dígitos)"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type CommunityAlertFreeInput = z.infer<typeof communityAlertFreeSchema>;

export async function createCommunityAlert(params: {
  input: CommunityAlertFreeInput;
  photoUrl: string;
  ipAddress?: string | null;
}) {
  const data = communityAlertFreeSchema.parse(params.input);
  if (!params.photoUrl?.trim()) {
    throw new AppError(400, "La foto es obligatoria");
  }

  return prisma.communityAlert.create({
    data: {
      species: data.species,
      zone: data.zone,
      whatsapp: data.whatsapp.replace(/\s+/g, ""),
      notes: data.notes?.trim() || null,
      photoUrl: params.photoUrl.trim(),
      status: "open",
      ipAddress: params.ipAddress ?? null,
    },
    select: {
      id: true,
      species: true,
      zone: true,
      photoUrl: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function listOpenCommunityAlerts(limit = 12) {
  return prisma.communityAlert.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 40),
    select: {
      id: true,
      species: true,
      zone: true,
      photoUrl: true,
      notes: true,
      status: true,
      createdAt: true,
      // whatsapp NO se expone en listado público
    },
  });
}
