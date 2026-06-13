import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type ResolvedQrToken =
  | { status: "active"; petId: string; isActive: boolean; qrToken: string }
  | { status: "deactivated" }
  | { status: "not_found" };

/** Variantes de lookup: algunos escáneres/URLs omiten el "_" inicial del token. */
function tokenLookupVariants(token: string): string[] {
  const trimmed = token.trim();
  if (!trimmed) return [];

  const variants = new Set<string>([trimmed]);
  if (!trimmed.startsWith("_")) {
    variants.add(`_${trimmed}`);
  } else {
    variants.add(trimmed.slice(1));
  }
  return [...variants];
}

export async function resolveQrToken(token: string): Promise<ResolvedQrToken> {
  for (const variant of tokenLookupVariants(token)) {
    const pet = await prisma.pet.findUnique({
      where: { qrToken: variant },
      select: { id: true, isActive: true, qrToken: true },
    });

    if (pet) {
      return {
        status: "active",
        petId: pet.id,
        isActive: pet.isActive,
        qrToken: pet.qrToken,
      };
    }
  }

  for (const variant of tokenLookupVariants(token)) {
    const historical = await prisma.qrTokenHistory.findUnique({
      where: { qrToken: variant },
      select: { id: true },
    });

    if (historical) {
      return { status: "deactivated" };
    }
  }

  return { status: "not_found" };
}
