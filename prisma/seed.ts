/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Coordenadas reales — Mar del Plata, Argentina */
const MAR_DEL_PLATA = {
  centro: { lat: -38.0055, lng: -57.5426 },
  playaBristol: { lat: -38.0182, lng: -57.5284 },
  puntaMogotes: { lat: -38.0812, lng: -57.5318 },
  plazaSanMartin: { lat: -37.9978, lng: -57.5512 },
} as const;

const DEMO_PASSWORD = "demo1234";

/** Cuentas reales: el seed no sobrescribe su contraseña al hacer upsert. */
const REAL_USER_EMAILS = new Set(["romarmarquez777@gmail.com"]);

const DEMO_PET_SHOPS = [
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

const TEST_USERS = [
  {
    email: "dueno@ejemplo.com",
    name: "María García",
    phone: "+5492235550101",
  },
  {
    email: "carlos@ejemplo.com",
    name: "Carlos Mendoza",
    phone: "+5492235550202",
  },
  {
    email: "romarmarquez777@gmail.com",
    name: "Romar Márquez",
    phone: null as string | null,
  },
] as const;

const DEMO_PETS = [
  {
    ownerEmail: "dueno@ejemplo.com",
    qrToken: "demo-qr-token-abc123",
    name: "Luna",
    species: "Perro",
    breed: "Golden Retriever",
    isLost: false,
    photoUrl:
      "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=400&fit=crop",
    lat: MAR_DEL_PLATA.centro.lat,
    lng: MAR_DEL_PLATA.centro.lng,
  },
  {
    ownerEmail: "dueno@ejemplo.com",
    qrToken: "demo-mia-mdp-2025",
    name: "Mia",
    species: "Perro",
    breed: "Bulldog Francés",
    isLost: false,
    photoUrl:
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop",
    lat: MAR_DEL_PLATA.plazaSanMartin.lat,
    lng: MAR_DEL_PLATA.plazaSanMartin.lng,
  },
  {
    ownerEmail: "romarmarquez777@gmail.com",
    qrToken: "_ID8cI1wZetjMStmecW-sRBa1_GpLtCX",
    name: "Nieve",
    species: "Perro",
    breed: "Pomerania",
    isLost: false,
    photoUrl:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    lat: MAR_DEL_PLATA.playaBristol.lat,
    lng: MAR_DEL_PLATA.playaBristol.lng,
  },
  {
    ownerEmail: "carlos@ejemplo.com",
    qrToken: "demo-rocco-mdp-2025",
    name: "Rocco",
    species: "Perro",
    breed: "Labrador",
    isLost: true,
    photoUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop",
    lat: MAR_DEL_PLATA.playaBristol.lat,
    lng: MAR_DEL_PLATA.playaBristol.lng,
  },
  {
    ownerEmail: "carlos@ejemplo.com",
    qrToken: "demo-thor-mdp-2025",
    name: "Thor",
    species: "Perro",
    breed: "Ovejero Alemán",
    isLost: true,
    photoUrl:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    lat: MAR_DEL_PLATA.puntaMogotes.lat,
    lng: MAR_DEL_PLATA.puntaMogotes.lng,
  },
] as const;

async function seedPetShops(prisma: PrismaClient) {
  const shops = [];

  for (const shop of DEMO_PET_SHOPS) {
    const saved = await prisma.petShop.upsert({
      where: { id: shop.id },
      update: {
        name: shop.name,
        type: shop.type,
        latitude: shop.latitude,
        longitude: shop.longitude,
        isActive: true,
      },
      create: {
        id: shop.id,
        name: shop.name,
        type: shop.type,
        latitude: shop.latitude,
        longitude: shop.longitude,
        isActive: true,
      },
    });
    shops.push(saved);
  }

  return shops;
}

async function seedDemoPets(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const usersByEmail = new Map<string, { id: string; email: string; name: string }>();

  for (const userData of TEST_USERS) {
    const isRealAccount = REAL_USER_EMAILS.has(userData.email);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: isRealAccount
        ? {
            name: userData.name,
            ...(userData.phone != null && { phone: userData.phone }),
          }
        : {
            passwordHash,
            name: userData.name,
            phone: userData.phone,
          },
      create: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        phone: userData.phone,
      },
    });
    usersByEmail.set(userData.email, user);
  }

  const seededPets = [];

  for (const petData of DEMO_PETS) {
    const owner = usersByEmail.get(petData.ownerEmail);
    if (!owner) {
      throw new Error(`Usuario no encontrado: ${petData.ownerEmail}`);
    }

    const pet = await prisma.pet.upsert({
      where: { qrToken: petData.qrToken },
      update: {
        userId: owner.id,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        photoUrl: petData.photoUrl,
        isLost: petData.isLost,
        isActive: true,
        lastLat: petData.lat,
        lastLng: petData.lng,
      },
      create: {
        userId: owner.id,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        photoUrl: petData.photoUrl,
        qrToken: petData.qrToken,
        isLost: petData.isLost,
        isActive: true,
        lastLat: petData.lat,
        lastLng: petData.lng,
      },
    });

    seededPets.push(pet);
  }

  return { users: [...usersByEmail.values()], pets: seededPets };
}

function printSeedSummary(
  users: { email: string; name: string }[],
  pets: {
    name: string;
    breed: string | null;
    isLost: boolean;
    qrToken: string;
    lastLat: number | null;
    lastLng: number | null;
  }[],
) {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Honey-app · Seed demo MVP (6 jun) — Mar del Plata");
  console.log("══════════════════════════════════════════════════════════\n");

  console.log("Usuarios (contraseña para todos: demo1234):");
  for (const user of users) {
    console.log(`  • ${user.email} — ${user.name}`);
  }

  console.log("\nMascotas:");
  for (const pet of pets) {
    const status = pet.isLost ? "🚨 PERDIDA" : "✓ A salvo";
    const gps =
      pet.lastLat != null && pet.lastLng != null
        ? `${pet.lastLat.toFixed(4)}, ${pet.lastLng.toFixed(4)}`
        : "sin GPS";
    console.log(`  • ${pet.name} (${pet.breed}) — ${status}`);
    console.log(`    QR: ${pet.qrToken}`);
    console.log(`    GPS: ${gps}`);
  }

  const lostCount = pets.filter((p) => p.isLost).length;
  console.log(`\nCentro Smart Tech: ${lostCount} alerta(s) activa(s) al cargar el panel.\n`);
  console.log("Tokens QR para pruebas:");
  console.log("  • Luna:  demo-qr-token-abc123");
  console.log("  • Nieve: _ID8cI1wZetjMStmecW-sRBa1_GpLtCX\n");
}

const prisma = new PrismaClient();

async function main() {
  const petShops = await seedPetShops(prisma);
  const { users, pets } = await seedDemoPets(prisma);
  printSeedSummary(users, pets);
  console.log(`\nPet shops aliados: ${petShops.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
