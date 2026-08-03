import { prisma } from "../db/client.js";
import { MISCELLANEOUS_RATE } from "@csp/shared";
import { ensureUserCategoryLibrary } from "./user-category.service.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
import type { PlanCalculations, SpendingPlan } from "@csp/shared";
import { AppError } from "../middleware/error-handler.js";

/**
 * Create a new spending plan with default line items.
 * Optionally copies line items from an existing plan.
 */
export async function createPlan(
  userId: string,
  month: number,
  year: number,
  copyFromPlanId?: string
): Promise<SpendingPlan> {
  // Check for existing plan for this month
  const existing = await prisma.spendingPlan.findUnique({
    where: { userId_month_year: { userId, month, year } },
  });
  if (existing) {
    throw new AppError(
      `A spending plan for ${MONTH_NAMES[month - 1]} ${year} already exists`,
      409
    );
  }

  // If copying from another plan, fetch its line items
  let lineItemsToCreate: Array<{
    section: string;
    label: string;
    amount: number;
    isDefault: boolean;
    sortOrder: number;
  }> = [];

  // Carry-over from the chronologically previous plan: investment + savings
  // amounts ("savings goals") and income. Fixed costs stay 0 because they are
  // derived from imported transactions, not entered by hand.
  const prevPlan = await prisma.spendingPlan.findFirst({
    where: {
      userId,
      OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { lineItems: true },
  });

  let carriedGross = 0;
  let carriedNet = 0;
  if (prevPlan) {
    carriedGross = Number(prevPlan.grossMonthlyIncome);
    carriedNet = Number(prevPlan.netMonthlyIncome);
  }

  if (copyFromPlanId) {
    const sourcePlan = await prisma.spendingPlan.findFirst({
      where: { id: copyFromPlanId, userId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!sourcePlan) {
      throw new AppError("Source plan not found", 404);
    }
    lineItemsToCreate = sourcePlan.lineItems.map((item: (typeof sourcePlan.lineItems)[number]) => ({
      section: item.section,
      label: item.label,
      amount: Number(item.amount),
      isDefault: item.isDefault,
      sortOrder: item.sortOrder,
    }));
  } else {
    await ensureUserCategoryLibrary(userId);
    const library = await prisma.userCategory.findMany({
      // deletedAt filter matters: without it a new plan would resurrect
      // archived categories as line items and back into the category dropdown.
      where: { userId, deletedAt: null },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Fixed-cost categories come from the user's library so the transaction
    // category dropdown always has the full set to choose from.
    const fixedCostItems = library
      .filter((c) => c.section === "fixed_costs")
      .map((c) => ({ section: c.section, label: c.label, amount: 0, isDefault: true, sortOrder: c.sortOrder }));

    // Investments + savings goals are carried over from the PREVIOUS plan only
    // (label + amount) — not the whole library — so a new plan doesn't surface
    // every goal the user has ever created. Brand-new users (no prior plan)
    // fall back to the library defaults for these sections.
    let goalItems: typeof lineItemsToCreate;
    const prevGoals = prevPlan?.lineItems.filter(
      (i) => i.section === "investments" || i.section === "savings"
    ) ?? [];
    if (prevGoals.length > 0) {
      goalItems = prevGoals.map((i) => ({
        section: i.section,
        label: i.label,
        amount: Number(i.amount),
        isDefault: i.isDefault,
        sortOrder: i.sortOrder,
      }));
    } else {
      goalItems = library
        .filter((c) => c.section === "investments" || c.section === "savings")
        .map((c) => ({ section: c.section, label: c.label, amount: 0, isDefault: true, sortOrder: c.sortOrder }));
    }

    lineItemsToCreate = [...fixedCostItems, ...goalItems];
  }

  const plan = await prisma.spendingPlan.create({
    data: {
      userId,
      month,
      year,
      // Carry income forward (gross + net) unless this is an explicit copy,
      // which already implies the user wants the source plan's structure.
      grossMonthlyIncome: copyFromPlanId ? undefined : carriedGross,
      netMonthlyIncome: copyFromPlanId ? undefined : carriedNet,
      lineItems: {
        create: lineItemsToCreate,
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  return formatPlanResponse(plan);
}

/** Get a single plan with all line items and computed calculations */
export async function getPlan(
  planId: string,
  userId: string
): Promise<SpendingPlan> {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
    include: {
      lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!plan) {
    throw new AppError("Spending plan not found", 404);
  }

  return formatPlanResponse(plan);
}

/** List all plans for a user (summary only) */
export async function listPlans(userId: string) {
  const plans = await prisma.spendingPlan.findMany({
    where: { userId },
    include: { lineItems: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const planIds = plans.map((p) => p.id);

  // Excluded fixed-cost category labels per plan — their transactions must not
  // count toward the fixed-cost subtotal (per-line "what-if" exclusion).
  const excludedFixedByPlan: Record<string, Set<string>> = {};
  for (const plan of plans) {
    excludedFixedByPlan[plan.id] = new Set(
      plan.lineItems.filter((i) => i.section === "fixed_costs" && i.excluded).map((i) => i.label)
    );
  }

  // Aggregate transaction-based fixed costs per plan
  const txns = await prisma.transaction.findMany({
    where: {
      import: { spendingPlanId: { in: planIds } },
      spendingCategory: "fixed_costs",
      isDuplicate: false,
      NOT: { type: "Payment" },
    },
    select: { amount: true, spendingSubcategory: true, import: { select: { spendingPlanId: true } } },
  });

  const fcSubtotalByPlan: Record<string, number> = {};
  for (const t of txns) {
    const pid = t.import.spendingPlanId;
    if (t.spendingSubcategory && excludedFixedByPlan[pid]?.has(t.spendingSubcategory)) continue;
    fcSubtotalByPlan[pid] = (fcSubtotalByPlan[pid] ?? 0) + -Number(t.amount);
  }

  return plans.map((plan) => {
    const investmentsTotal = plan.lineItems
      .filter((i) => i.section === "investments" && !i.excluded)
      .reduce((s, i) => s + Number(i.amount), 0);
    const savingsTotal = plan.lineItems
      .filter((i) => i.section === "savings" && !i.excluded)
      .reduce((s, i) => s + Number(i.amount), 0);

    const totals = computePlanTotals({
      netMonthlyIncome: Number(plan.netMonthlyIncome),
      assets: Number(plan.assets),
      investmentsNw: Number(plan.investmentsNw),
      savingsNw: Number(plan.savingsNw),
      debt: Number(plan.debt),
      includeMiscellaneous: plan.includeMiscellaneous,
      fixedCostsSubtotal: fcSubtotalByPlan[plan.id] ?? 0,
      investmentsTotal,
      savingsTotal,
    });

    return {
      id: plan.id,
      month: plan.month,
      year: plan.year,
      isLocked: plan.isLocked,
      updatedAt: plan.updatedAt.toISOString(),
      ...totals,
    };
  });
}

export interface PlanTotalsInput {
  netMonthlyIncome: number;
  assets: number;
  investmentsNw: number;
  savingsNw: number;
  debt: number;
  includeMiscellaneous: boolean;
  /** Fixed-cost spend before the miscellaneous uplift. */
  fixedCostsSubtotal: number;
  investmentsTotal: number;
  savingsTotal: number;
}

/**
 * The Conscious Spending Plan arithmetic, kept pure so it can be tested
 * without a database.
 *
 * Miscellaneous is never stored — when enabled it is a 15% uplift on the
 * fixed-cost subtotal, computed here every time. Guilt-free spending is
 * whatever net income is left after fixed costs, investments and savings, and
 * is allowed to go negative: that is a real state the plan needs to show
 * rather than clamp away.
 */
export function computePlanTotals(input: PlanTotalsInput) {
  const net = input.netMonthlyIncome;
  // Percentages are of net income; guard the divide so an unfilled plan
  // reports 0% instead of NaN or Infinity.
  const safePercent = (v: number) => (net > 0 ? v / net : 0);

  const fixedCostsTotal =
    input.fixedCostsSubtotal +
    (input.includeMiscellaneous
      ? input.fixedCostsSubtotal * MISCELLANEOUS_RATE
      : 0);

  const guiltFreeTotal =
    net - fixedCostsTotal - input.investmentsTotal - input.savingsTotal;

  return {
    netMonthlyIncome: net,
    totalNetWorth:
      input.assets + input.investmentsNw + input.savingsNw - input.debt,
    fixedCostsTotal,
    fixedCostsPercentage: safePercent(fixedCostsTotal),
    investmentsPercentage: safePercent(input.investmentsTotal),
    savingsPercentage: safePercent(input.savingsTotal),
    guiltFreePercentage: safePercent(guiltFreeTotal),
    guiltFreeTotal,
  };
}

/** Update top-level plan fields (net worth, income) */
export async function updatePlan(
  planId: string,
  userId: string,
  data: {
    assets?: number;
    investmentsNw?: number;
    savingsNw?: number;
    debt?: number;
    grossMonthlyIncome?: number;
    netMonthlyIncome?: number;
  }
): Promise<SpendingPlan> {
  // Verify ownership
  const existing = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!existing) {
    throw new AppError("Spending plan not found", 404);
  }

  const plan = await prisma.spendingPlan.update({
    where: { id: planId },
    data,
    include: {
      lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });

  return formatPlanResponse(plan);
}

/** Delete a spending plan */
export async function deletePlan(
  planId: string,
  userId: string
): Promise<void> {
  const existing = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!existing) {
    throw new AppError("Spending plan not found", 404);
  }

  await prisma.spendingPlan.delete({ where: { id: planId } });
}

// ──────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────

interface PlanWithLineItems {
  id: string;
  userId: string;
  month: number;
  year: number;
  assets: any;
  investmentsNw: any;
  savingsNw: any;
  debt: any;
  grossMonthlyIncome: any;
  netMonthlyIncome: any;
  includeMiscellaneous: boolean;
  notes: string | null;
  customTransactionTypes: string[];
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lineItems: Array<{
    id: string;
    spendingPlanId: string;
    section: string;
    label: string;
    amount: any;
    isDefault: boolean;
    excluded: boolean;
    sortOrder: number;
    createdAt: Date;
  }>;
}

function computeCalculations(plan: PlanWithLineItems): PlanCalculations {
  const netIncome = Number(plan.netMonthlyIncome);
  const includeMiscellaneous = plan.includeMiscellaneous;

  // Excluded lines are dropped from their section totals (per-line what-if toggle).
  const fixedCostItems = plan.lineItems.filter(
    (i) => i.section === "fixed_costs" && !i.excluded
  );
  const investmentItems = plan.lineItems.filter(
    (i) => i.section === "investments" && !i.excluded
  );
  const savingsItems = plan.lineItems.filter((i) => i.section === "savings" && !i.excluded);

  const fixedCostsSubtotal = fixedCostItems.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const miscellaneous = includeMiscellaneous ? fixedCostsSubtotal * MISCELLANEOUS_RATE : 0;
  const fixedCostsTotal = fixedCostsSubtotal + miscellaneous;

  const investmentsTotal = investmentItems.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const savingsTotal = savingsItems.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const guiltFreeTotal = netIncome - fixedCostsTotal - investmentsTotal - savingsTotal;

  const safePercent = (value: number) =>
    netIncome > 0 ? value / netIncome : 0;

  return {
    fixedCostsSubtotal,
    miscellaneous,
    fixedCostsTotal,
    fixedCostsPercentage: safePercent(fixedCostsTotal),
    investmentsTotal,
    investmentsPercentage: safePercent(investmentsTotal),
    savingsTotal,
    savingsPercentage: safePercent(savingsTotal),
    guiltFreeTotal,
    guiltFreePercentage: safePercent(guiltFreeTotal),
    totalNetWorth:
      Number(plan.assets) +
      Number(plan.investmentsNw) +
      Number(plan.savingsNw) -
      Number(plan.debt),
  };
}

function formatPlanResponse(plan: PlanWithLineItems): SpendingPlan {
  return {
    id: plan.id,
    userId: plan.userId,
    month: plan.month,
    year: plan.year,
    assets: Number(plan.assets),
    investmentsNw: Number(plan.investmentsNw),
    savingsNw: Number(plan.savingsNw),
    debt: Number(plan.debt),
    grossMonthlyIncome: Number(plan.grossMonthlyIncome),
    netMonthlyIncome: Number(plan.netMonthlyIncome),
    includeMiscellaneous: plan.includeMiscellaneous,
    notes: plan.notes ?? null,
    customTransactionTypes: plan.customTransactionTypes,
    isLocked: plan.isLocked,
    lineItems: plan.lineItems.map((item) => ({
      id: item.id,
      spendingPlanId: item.spendingPlanId,
      section: item.section as "fixed_costs" | "investments" | "savings",
      label: item.label,
      amount: Number(item.amount),
      isDefault: item.isDefault,
      excluded: item.excluded,
      sortOrder: item.sortOrder,
    })),
    calculations: computeCalculations(plan),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}
