import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getRescuerBadge } from "../lib/rescuerBadge";

const RETURN_REPUTATION_POINTS = 3;

const RESCUER_PROFILE_SELECT = {
  id: true,
  reputationScore: true,
  userId: true,
} as const satisfies Prisma.RescuerProfileSelect;

export async function getRescuerReputation(visitorFingerprint?: string | null) {
  if (!visitorFingerprint) {
    return getRescuerBadge(0);
  }

  const profile = await prisma.rescuerProfile.findUnique({
    where: { visitorFingerprint },
    select: { reputationScore: true },
  });

  return getRescuerBadge(profile?.reputationScore ?? 0);
}

export async function awardReturnReputation(visitorFingerprint?: string | null) {
  if (!visitorFingerprint) {
    return getRescuerBadge(0);
  }

  const profile = await prisma.rescuerProfile.upsert({
    where: { visitorFingerprint },
    update: {
      reputationScore: { increment: RETURN_REPUTATION_POINTS },
    },
    create: {
      visitorFingerprint,
      reputationScore: RETURN_REPUTATION_POINTS,
    },
    select: RESCUER_PROFILE_SELECT,
  });

  if (profile.userId) {
    await prisma.user.update({
      where: { id: profile.userId },
      data: { reputationScore: { increment: RETURN_REPUTATION_POINTS } },
    });
  }

  return getRescuerBadge(profile.reputationScore);
}
