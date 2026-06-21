import { prisma } from "./prisma";

export type SafePoint = {
  id: string;
  type: "veterinary" | "petshop";
  name: string;
  latitude: number;
  longitude: number;
  emoji: string;
};

/** Puntos seguros aliados desde la base de datos (veterinarias y pet shops). */
export async function loadSafePointsFromDb(): Promise<SafePoint[]> {
  const shops = await prisma.petShop.findMany({
    where: {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      type: true,
      latitude: true,
      longitude: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return shops
    .filter(
      (shop): shop is typeof shop & { latitude: number; longitude: number } =>
        shop.latitude != null && shop.longitude != null,
    )
    .map((shop) => ({
      id: shop.id,
      type: shop.type === "veterinary" ? "veterinary" : "petshop",
      name: shop.name,
      latitude: shop.latitude,
      longitude: shop.longitude,
      emoji: shop.type === "veterinary" ? "🏥" : "🛒",
    }));
}
