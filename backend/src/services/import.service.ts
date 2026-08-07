import { prisma } from "../db/client.js";
import type { CsvTransaction } from "@csp/shared";
import { AppError } from "../middleware/error-handler.js";
import { normalizeDescription } from "../utils/normalize.js";
import { recomputeNetIncome, recomputeNetIncomeForPlans } from "./net-income.service.js";

/**
 * Import parsed CSV transactions into a spending plan.
 * Aggregates with existing transactions and marks duplicates.
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

  // Build a set of existing transaction keys to detect duplicates.
  // Scoped strictly to THIS plan and excludes soft-deleted rows so a deleted +
  // re-imported transaction isn't permanently flagged as a duplicate.
  const existing = await prisma.transaction.findMany({
    where: { import: { spendingPlanId: planId }, deletedAt: null },
    select: { transactionDate: true, description: true, amount: true },
  });
  const existingKeys = new Set(
    existing.map(
      (t) => `${t.transactionDate.toISOString().split("T")[0]}|${t.description}|${Number(t.amount)}`
    )
  );

  // Filter out any rows with unparseable dates before inserting
  const validTransactions = transactions.filter((t) => {
    const d = new Date(t.transactionDate);
    return !isNaN(d.getTime());
  });
  if (validTransactions.length === 0) {
    throw new AppError("No valid transactions found — all rows had invalid dates", 400);
  }

  // Auto-categorize server-side, in one pass against the user's category memory.
  // This replaces the old client flow that fired one PUT per transaction
  // sequentially — for large imports that was hundreds of round-trips.
  const suggestions = await autoCategorize(
    userId,
    validTransactions.map((t) => t.description)
  );

  const importRecord = await prisma.transactionImport.create({
    data: {
      spendingPlanId: planId,
      transactions: {
        create: validTransactions.map((t) => {
          const key = `${new Date(t.transactionDate).toISOString().split("T")[0]}|${t.description}|${t.amount}`;
          const postDate = new Date(t.postDate);
          const match = suggestions.get(t.description);
          return {
            transactionDate: new Date(t.transactionDate),
            postDate: isNaN(postDate.getTime()) ? new Date(t.transactionDate) : postDate,
            description: t.description,
            originalCategory: t.category || null,
            type: t.type,
            amount: t.amount,
            memo: t.memo || null,
            accountType: t.accountType ?? null,
            isDuplicate: existingKeys.has(key),
            spendingCategory: match?.spendingCategory ?? null,
            spendingSubcategory: match?.spendingSubcategory ?? null,
          };
        }),
      },
    },
    include: { transactions: true },
  });

  // Server-side auto-categorize (above) may have tagged newly-imported rows as
  // income, so net income could need recomputing on every import.
  await recomputeNetIncome(planId);

  return importRecord;
}

/** Soft-delete a single transaction */
export async function deleteTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { import: { include: { spendingPlan: true } } },
  });
  if (!transaction || transaction.import.spendingPlan.userId !== userId) {
    throw new AppError("Transaction not found", 404);
  }
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { deletedAt: new Date() },
  });
  if (transaction.spendingCategory === "income") {
    await recomputeNetIncome(transaction.import.spendingPlanId);
  }
}

/**
 * Soft-delete several transactions in one request.
 *
 * Every id must resolve to a transaction owned by this user before anything
 * is deleted — a partial match (some ids belong to someone else, or don't
 * exist) rejects the whole request rather than silently deleting the subset
 * that did match, which could mask a bug in the caller or a manipulated id.
 */
export async function bulkDeleteTransactions(transactionIds: string[], userId: string) {
  const owned = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, import: { spendingPlan: { userId } } },
    select: { id: true, spendingCategory: true, import: { select: { spendingPlanId: true } } },
  });

  if (owned.length !== new Set(transactionIds).size) {
    throw new AppError("One or more transactions were not found", 404);
  }

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { deletedAt: new Date() },
  });

  const affectedIncomePlans = owned
    .filter((t) => t.spendingCategory === "income")
    .map((t) => t.import.spendingPlanId);
  if (affectedIncomePlans.length > 0) {
    await recomputeNetIncomeForPlans(affectedIncomePlans);
  }
}

/** Restore a soft-deleted transaction */
export async function restoreTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { import: { include: { spendingPlan: true } } },
  });
  if (!transaction || transaction.import.spendingPlan.userId !== userId) {
    throw new AppError("Transaction not found", 404);
  }
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { deletedAt: null },
  });
  if (transaction.spendingCategory === "income") {
    await recomputeNetIncome(transaction.import.spendingPlanId);
  }
}

/** Add a single manual transaction to a plan */
export async function addManualTransaction(
  planId: string,
  userId: string,
  data: {
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    memo?: string;
  }
) {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) throw new AppError("Spending plan not found", 404);

  const date = new Date(data.transactionDate);
  const importRecord = await prisma.transactionImport.create({
    data: {
      spendingPlanId: planId,
      transactions: {
        create: [{
          transactionDate: date,
          postDate: date,
          description: data.description,
          type: data.type,
          amount: data.amount,
          memo: data.memo || null,
          isManual: true,
        }],
      },
    },
    include: { transactions: true },
  });

  return importRecord.transactions[0];
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
        where: { deletedAt: null },
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
      accountType: t.accountType,
      isDuplicate: t.isDuplicate,
      isManual: t.isManual,
    }))
  );
}

/** Get soft-deleted transactions for a spending plan */
export async function getDeletedTransactions(planId: string, userId: string) {
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
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      },
    },
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
      accountType: t.accountType,
      isDuplicate: t.isDuplicate,
      isManual: t.isManual,
      deletedAt: t.deletedAt?.toISOString() ?? null,
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

  const wasIncome = transaction.spendingCategory === "income";
  const isIncome = spendingCategory === "income";

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: { spendingCategory, spendingSubcategory },
  });

  if (wasIncome || isIncome) {
    await recomputeNetIncome(transaction.import.spendingPlanId);
  }

  return updated;
}

/** Update a transaction's account type */
export async function updateTransactionAccountType(
  transactionId: string,
  userId: string,
  accountType: "credit_card" | "checking" | "savings" | null
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { import: { include: { spendingPlan: true } } },
  });

  if (!transaction || transaction.import.spendingPlan.userId !== userId) {
    throw new AppError("Transaction not found", 404);
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: { accountType },
  });
}

/** Update a transaction's type */
export async function updateTransactionType(
  transactionId: string,
  userId: string,
  type: "Sale" | "Return" | "Payment" | "Adjustment" | "Debit" | "Credit"
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { import: { include: { spendingPlan: true } } },
  });

  if (!transaction || transaction.import.spendingPlan.userId !== userId) {
    throw new AppError("Transaction not found", 404);
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: { type },
  });
}

/** Split a normalized description into meaningful word tokens (length ≥ 2). */
function tokenize(s: string): Set<string> {
  return new Set(s.split(" ").filter((t) => t.length >= 2));
}

/**
 * Jaccard similarity between two tokenized descriptions.
 * Score = |intersection| / |union|, range 0–1.
 *
 * Preferred over character-level Levenshtein for merchant names because
 * word overlap is a stronger signal than edit distance — "WHOLE FOODS MARKET"
 * and "WHOLE FOODS" share 2/3 tokens (0.67) even though they differ by 6 chars.
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokA) {
    if (tokB.has(t)) intersection++;
  }
  return intersection / (tokA.size + tokB.size - intersection);
}

// Jaccard scores are naturally lower than Levenshtein for partial matches,
// so 0.5 is the right threshold: requires ≥1 shared token out of 2 unique tokens.
const FUZZY_THRESHOLD = 0.5;

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

  // Pre-index by normalized description for O(1) exact-match lookup. A repeat
  // import (the common case for a returning user) is mostly exact hits on
  // merchants seen before, so this turns the typical row from an O(mappings)
  // scan into an O(1) lookup instead of only short-circuiting the scan early.
  const exactByNorm = new Map<string, (typeof mappings)[number]>();
  for (const mapping of mappings) {
    exactByNorm.set(mapping.descriptionNormalized, mapping);
  }

  const result = new Map<
    string,
    { spendingCategory: string; spendingSubcategory: string; timesUsed: number }
  >();

  for (const description of descriptions) {
    const norm = normalizeDescription(description);

    const exact = exactByNorm.get(norm);
    if (exact) {
      result.set(description, {
        spendingCategory: exact.spendingCategory,
        spendingSubcategory: exact.spendingSubcategory,
        timesUsed: exact.timesUsed,
      });
      continue;
    }

    // No exact hit — fall back to the O(mappings) fuzzy scan.
    let bestMatch: (typeof mappings)[number] | null = null;
    let bestScore = 0;

    for (const mapping of mappings) {
      const keyword = mapping.descriptionNormalized;

      // Substring containment (keyword appears in description or vice versa)
      let score = 0;
      if (keyword.length >= 3 && norm.includes(keyword)) {
        score = 0.9;
      } else if (keyword.length >= 3 && keyword.includes(norm)) {
        score = 0.85;
      } else {
        // Jaccard token overlap
        score = jaccardSimilarity(norm, keyword);
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

/** Permanently delete all transactions for a plan */
export async function deleteAllTransactions(planId: string, userId: string): Promise<void> {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!plan) throw new AppError("Spending plan not found", 404);

  await prisma.transaction.deleteMany({
    where: { import: { spendingPlanId: planId } },
  });

  // No-op once everything's gone (zero income transactions left), but keeps
  // this consistent with every other mutation path rather than special-cased.
  await recomputeNetIncome(planId);
}
