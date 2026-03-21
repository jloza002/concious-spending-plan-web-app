import { prisma } from "../db/client.js";
import { normalizeDescription } from "../utils/normalize.js";
import { AppError } from "../middleware/error-handler.js";

/** Get all category mappings for a user */
export async function getMappings(userId: string) {
  return prisma.categoryMapping.findMany({
    where: { userId },
    orderBy: { timesUsed: "desc" },
  });
}

/**
 * Save or update a category mapping.
 * If a mapping for this description already exists, update it.
 */
export async function saveMappingFromDescription(
  userId: string,
  rawDescription: string,
  spendingCategory: string,
  spendingSubcategory: string
) {
  const descriptionNormalized = normalizeDescription(rawDescription);

  return prisma.categoryMapping.upsert({
    where: {
      userId_descriptionNormalized: { userId, descriptionNormalized },
    },
    update: {
      spendingCategory,
      spendingSubcategory,
      timesUsed: { increment: 1 },
      lastUsedAt: new Date(),
    },
    create: {
      userId,
      descriptionNormalized,
      spendingCategory,
      spendingSubcategory,
    },
  });
}

/** Delete a category mapping */
export async function deleteMapping(mappingId: string, userId: string) {
  const mapping = await prisma.categoryMapping.findFirst({
    where: { id: mappingId, userId },
  });
  if (!mapping) {
    throw new AppError("Category mapping not found", 404);
  }

  await prisma.categoryMapping.delete({ where: { id: mappingId } });
}
