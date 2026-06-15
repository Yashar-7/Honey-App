import { prisma } from "../lib/prisma";

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
