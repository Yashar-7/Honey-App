/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

/** Aliados locales reales — Mar del Plata (mapa del panel dueño). */
const PET_SHOPS = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    name: "Veterinaria Atlántica",
    type: "veterinary",
    latitude: -38.0022,
    longitude: -57.5485,
  },
  {
    id: "a1111111-1111-4111-8111-111111111102",
    name: "Clínica Vet del Sur",
    type: "veterinary",
    latitude: -38.0185,
    longitude: -57.532,
  },
  {
    id: "a1111111-1111-4111-8111-111111111103",
    name: "Pet Shop Max",
    type: "petshop",
    latitude: -38.008,
    longitude: -57.561,
  },
  {
    id: "a1111111-1111-4111-8111-111111111104",
    name: "Huellas & Co.",
    type: "petshop",
    latitude: -37.995,
    longitude: -57.539,
  },
  {
    id: "a1111111-1111-4111-8111-111111111105",
    name: "Veterinaria Centro MDP",
    type: "veterinary",
    latitude: -37.9995,
    longitude: -57.5565,
  },
] as const;

const prisma = new PrismaClient();

async function main() {
  for (const shop of PET_SHOPS) {
    await prisma.petShop.upsert({
      where: { id: shop.id },
      create: {
        id: shop.id,
        name: shop.name,
        type: shop.type,
        latitude: shop.latitude,
        longitude: shop.longitude,
        isActive: true,
      },
      update: {
        name: shop.name,
        type: shop.type,
        latitude: shop.latitude,
        longitude: shop.longitude,
        isActive: true,
      },
    });
  }

  console.log(`Honey App · Seed: ${PET_SHOPS.length} aliados cargados (veterinarias y pet shops).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
