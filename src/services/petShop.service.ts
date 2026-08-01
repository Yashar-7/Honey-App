import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const petShopInputSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(120),
  type: z.enum(["veterinary", "petshop"], {
    errorMap: () => ({ message: "Tipo inválido (veterinary | petshop)" }),
  }),
  address: z.string().trim().max(240).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isActive: z.boolean().optional().default(true),
});

export async function listActivePetShops() {
  return prisma.petShop.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      latitude: true,
      longitude: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function listAllPetShopsForAdmin() {
  return prisma.petShop.findMany({
    orderBy: [{ isActive: "desc" }, { type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      latitude: true,
      longitude: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createPetShop(
  input: z.infer<typeof petShopInputSchema>,
) {
  const data = petShopInputSchema.parse(input);
  return prisma.petShop.create({
    data: {
      name: data.name,
      type: data.type,
      address: data.address?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      isActive: data.isActive ?? true,
    },
  });
}

export async function setPetShopActive(id: string, isActive: boolean) {
  const existing = await prisma.petShop.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Comercio no encontrado");
  }
  return prisma.petShop.update({
    where: { id },
    data: { isActive },
  });
}
