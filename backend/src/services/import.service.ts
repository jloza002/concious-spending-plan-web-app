import { prisma } from "../db/client.js";
import type { CsvTransaction } from "@csp/shared";
import { AppError } from "../middleware/error-handler.js";
import { normalizeDescription } from "../utils/normalize.js";

/**
 * Import parsed CSV transactions into a spending plan.
 * Returns the created import with transactions.
 */
export async function importTransactions(
  planId: string,
  userId: string,
  transactions: CsvTransaction[]
) {
  // Verify plan ownership
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) {
    throw new AppError("Spending plan not found", 404);
  }

  const importRecord = await prisma.transactionImport.create({
    data: {
      spendingPlanId: planId,
      transactions: {
        create: transactions.map((t) => ({
          transactionDate: new Date(t.transactionDate),
          postDate: new Date(t.postDate),
          description: t.description,
          originalCategory: t.category || null,
          type: t.type,
          amount: t.amount,
          memo: t.memo || null,
        })),
      },
    },
    include: {
      transactions: true,
    },
  });

  return importRecord;
}

/** Get all transactions for a spending plan */
export async function getTransactions(planId: string, userId: string) {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) {
    throw new AppError("Spending plan not found", 404);
  }

  const imports = await prisma.transactionImport.findMany({
    where: { spendingPlanId: planId },
    include: {
      transactions: {
        orderBy: { transactionDate: "desc" },
      },
    },
    orderBy: { importedAt: "desc" },
  });

  type ImportWithTx = (typeof imports)[number];
  type Tx = ImportWithTx["transactions"][number];

  return imports.flatMap((imp: ImportWithTx) =>
    imp.transactions.map((t: Tx) => ({
      id: t.id,
      importId: t.importId,
      transactionDate: t.transactionDate.toISOString().split("T")[0],
      postDate: t.postDate.toISOString().split("T")[0],
      description: t.description,
      originalCategory: t.originalCategory,
      type: t.type,
      amount: Number(t.amount),
      memo: t.memo,
      spendingCategory: t.spendingCategory,
      spendingSubcategory: t.spendingSubcategory,
    }))
  );
}

/** Update a transaction's category assignment */
export async function assignCategory(
  transactionId: string,
  userId: string,
  spendingCategory: string | null,
  spendingSubcategory: string | null
) {
  // Verify ownership through the import -> plan -> user chain
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      import: {
        include: {
          spendingPlan: true,
        },
      },
    },
  });

  if (!transaction || transaction.import.spendingPlan.userId !== userId) {
    throw new AppError("Transaction not found", 404);
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: { spendingCategory, spendingSubcategory },
  });
}

/**
 * Auto-categorize transactions using the user's category memory.
 * Returns a map of description -> suggested category.
 */
export async function autoCategorize(
  userId: string,
  descriptions: string[]
): Promise<
  Map<string, { spendingCategory: string; spendingSubcategory: string; timesUsed: number }>
> {
  const normalized = descriptions.map((d) => normalizeDescription(d));
  const uniqueNormalized = [...new Set(normalized)];

  const mappings = await prisma.categoryMapping.findMany({
    where: {
      userId,
      descriptionNormalized: { in: uniqueNormalized },
    },
  });

  const result = new Map<
    string,
    { spendingCategory: string; spendingSubcategory: string; timesUsed: number }
  >();

  for (let i = 0; i < descriptions.length; i++) {
    const norm = normalized[i];
    const mapping = mappings.find((m: (typeof mappings)[number]) => m.descriptionNormalized === norm);
    if (mapping) {
      result.set(descriptions[i], {
        spendingCategory: mapping.spendingCategory,
        spendingSubcategory: mapping.spendingSubcategory,
        timesUsed: mapping.timesUsed,
      });
    }
  }

  return result;
}
