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

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity score 0–1 between two normalized strings */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.75;

/**
 * Auto-categorize transactions using the user's category memory.
 * Uses fuzzy matching: exact → substring containment → similarity score.
 * Returns a map of description -> suggested category.
 */
export async function autoCategorize(
  userId: string,
  descriptions: string[]
): Promise<
  Map<string, { spendingCategory: string; spendingSubcategory: string; timesUsed: number }>
> {
  const mappings = await prisma.categoryMapping.findMany({ where: { userId } });

  const result = new Map<
    string,
    { spendingCategory: string; spendingSubcategory: string; timesUsed: number }
  >();

  for (const description of descriptions) {
    const norm = normalizeDescription(description);
    let bestMatch: (typeof mappings)[number] | null = null;
    let bestScore = 0;

    for (const mapping of mappings) {
      const keyword = mapping.descriptionNormalized;

      // 1. Exact match
      if (norm === keyword) {
        bestMatch = mapping;
        bestScore = 1;
        break;
      }

      // 2. Substring containment (keyword appears in description or vice versa)
      let score = 0;
      if (keyword.length >= 3 && norm.includes(keyword)) {
        score = 0.9;
      } else if (keyword.length >= 3 && keyword.includes(norm)) {
        score = 0.85;
      } else {
        // 3. Fuzzy similarity
        score = similarity(norm, keyword);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = mapping;
      }
    }

    if (bestMatch && bestScore >= FUZZY_THRESHOLD) {
      result.set(description, {
        spendingCategory: bestMatch.spendingCategory,
        spendingSubcategory: bestMatch.spendingSubcategory,
        timesUsed: bestMatch.timesUsed,
      });
    }
  }

  return result;
}
