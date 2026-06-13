import { prisma } from "../lib/prisma";

export async function getActiveLostPetAlerts() {
  const alerts = await prisma.pet.findMany({
    where: {
      isLost: true,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      photoUrl: true,
      lastLat: true,
      lastLng: true,
      isLost: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    count: alerts.length,
    alerts,
  };
}
