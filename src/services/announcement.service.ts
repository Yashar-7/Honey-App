import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const announcementInputSchema = z.object({
  title: z.string().trim().min(3, "Título muy corto").max(120),
  body: z.string().trim().min(10, "El aviso necesita más detalle").max(2000),
  tag: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .default("Comunidad"),
  isPublished: z.boolean().optional().default(true),
});

export async function listPublishedAnnouncements(limit = 12) {
  return prisma.announcement.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      id: true,
      title: true,
      body: true,
      tag: true,
      publishedAt: true,
    },
  });
}

export async function listAllAnnouncementsForAdmin() {
  return prisma.announcement.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      tag: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createAnnouncement(
  input: z.infer<typeof announcementInputSchema>,
  createdById?: string,
) {
  const data = announcementInputSchema.parse(input);
  return prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      tag: data.tag,
      isPublished: data.isPublished,
      publishedAt: new Date(),
      createdById: createdById ?? null,
    },
  });
}

export async function updateAnnouncement(
  id: string,
  input: Partial<z.infer<typeof announcementInputSchema>>,
) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Aviso no encontrado");
  }

  const patch = announcementInputSchema.partial().parse(input);
  const becomingPublished =
    patch.isPublished === true && existing.isPublished === false;

  return prisma.announcement.update({
    where: { id },
    data: {
      ...patch,
      ...(becomingPublished ? { publishedAt: new Date() } : {}),
    },
  });
}

export async function deleteAnnouncement(id: string) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Aviso no encontrado");
  }
  await prisma.announcement.delete({ where: { id } });
  return { ok: true as const };
}
