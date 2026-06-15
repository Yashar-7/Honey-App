import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  getSafePointsNear,
  type SafePoint,
} from "../lib/safePoints";

export type { SafePoint };

const WAR_ROOM_SCAN_SELECT = {
  id: true,
  petId: true,
  latitude: true,
  longitude: true,
  accuracy: true,
  addressLabel: true,
  scannedAt: true,
  pet: { select: { name: true } },
} as const satisfies Prisma.ScanSelect;

type WarRoomScan = Prisma.ScanGetPayload<{
  select: typeof WAR_ROOM_SCAN_SELECT;
}>;

export type WarRoomReport = {
  id: string;
  type: "gps" | "report";
  petId: string;
  petName: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  text: string | null;
  locationReference: string | null;
  imageUrl: string | null;
  sessionId: string | null;
  createdAt: string;
};

function toIso(date: Date): string {
  return date.toISOString();
}

function scanToReport(scan: WarRoomScan): WarRoomReport {
  const address =
    scan.addressLabel?.trim() || "Zona: Mar del Plata Centro";

  return {
    id: `scan-${scan.id}`,
    type: "gps",
    petId: scan.petId,
    petName: scan.pet.name,
    latitude: scan.latitude.toNumber(),
    longitude: scan.longitude.toNumber(),
    accuracy: scan.accuracy,
    text: null,
    locationReference: `📍 ${address}`,
    imageUrl: null,
    sessionId: null,
    createdAt: toIso(scan.scannedAt),
  };
}

function messageToReport(
  message: {
    id: string;
    text: string | null;
    locationReference: string | null;
    imageUrl: string | null;
    createdAt: Date;
    sessionId: string;
    session: {
      pet: {
        id: string;
        name: string;
        lastLat: number | null;
        lastLng: number | null;
      };
    };
  },
): WarRoomReport {
  return {
    id: `msg-${message.id}`,
    type: "report",
    petId: message.session.pet.id,
    petName: message.session.pet.name,
    latitude: message.session.pet.lastLat,
    longitude: message.session.pet.lastLng,
    accuracy: null,
    text: message.text,
    locationReference: message.locationReference,
    imageUrl: message.imageUrl,
    sessionId: message.sessionId,
    createdAt: toIso(message.createdAt),
  };
}

export async function getOwnerWarRoom(userId: string, since?: Date) {
  const pets = await prisma.pet.findMany({
    where: { userId, isActive: true },
    select: {
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
      finderMessage: true,
      photoUrl: true,
      qrToken: true,
      isLost: true,
      lastLat: true,
      lastLng: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  const petIds = pets.map((pet) => pet.id);
  const lostPetIds = pets.filter((p) => p.isLost).map((p) => p.id);

  const anchorPet = pets.find((p) => p.lastLat != null && p.lastLng != null) ?? pets[0];
  const safePoints = getSafePointsNear(
    anchorPet?.lastLat ?? -38.0055,
    anchorPet?.lastLng ?? -57.5426,
  );

  if (petIds.length === 0) {
    return {
      serverTime: toIso(new Date()),
      pets: [],
      activeChats: [],
      reports: [],
      safePoints,
      mode: "owner" as const,
    };
  }

  const activeSessions = await prisma.contactSession.findMany({
    where: {
      petId: { in: petIds },
      status: "open",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
      pet: { select: { id: true, name: true, photoUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          sender: true,
          text: true,
          imageUrl: true,
          createdAt: true,
        },
      },
    },
  });

  const activeChats = activeSessions.map((session) => ({
    sessionId: session.id,
    petId: session.pet.id,
    petName: session.pet.name,
    petPhotoUrl: session.pet.photoUrl,
    expiresAt: toIso(session.expiresAt),
    createdAt: toIso(session.createdAt),
    lastMessage: session.messages[0] ?? null,
  }));

  if (lostPetIds.length === 0) {
    return {
      serverTime: toIso(new Date()),
      pets,
      activeChats,
      reports: [],
      safePoints,
      mode: "owner" as const,
    };
  }

  const [scans, messages] = await Promise.all([
    prisma.scan.findMany({
      where: {
        petId: { in: lostPetIds },
        ...(since ? { scannedAt: { gt: since } } : {}),
      },
      take: since ? 100 : 50,
      orderBy: { scannedAt: "desc" },
      select: WAR_ROOM_SCAN_SELECT,
    }),
    prisma.message.findMany({
      where: {
        sender: "finder",
        session: { petId: { in: lostPetIds } },
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      take: since ? 100 : 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        locationReference: true,
        imageUrl: true,
        createdAt: true,
        sessionId: true,
        session: {
          select: {
            pet: {
              select: {
                id: true,
                name: true,
                lastLat: true,
                lastLng: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const reports = [
    ...scans.map(scanToReport),
    ...messages.map(messageToReport),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, since ? 100 : 40);

  const sessionByPetId = new Map(
    activeSessions.map((s) => [s.pet.id, s.id]),
  );
  for (const report of reports) {
    if (!report.sessionId && sessionByPetId.has(report.petId)) {
      report.sessionId = sessionByPetId.get(report.petId)!;
    }
  }

  return {
    serverTime: toIso(new Date()),
    pets,
    activeChats,
    reports,
    safePoints,
    mode: "emergency" as const,
  };
}
