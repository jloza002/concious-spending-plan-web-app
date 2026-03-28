import { prisma } from "../db/client.js";
import {
  DEFAULT_FIXED_COSTS,
  DEFAULT_INVESTMENTS,
  DEFAULT_SAVINGS,
  MISCELLANEOUS_RATE,
} from "@csp/shared";

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
    // Create default line items
    lineItemsToCreate = [
      ...DEFAULT_FIXED_COSTS.map((label, i) => ({
        section: "fixed_costs",
        label,
        amount: 0,
        isDefault: true,
        sortOrder: i + 1,
      })),
      ...DEFAULT_INVESTMENTS.map((label, i) => ({
        section: "investments",
        label,
        amount: 0,
        isDefault: true,
        sortOrder: i + 1,
      })),
      ...DEFAULT_SAVINGS.map((label, i) => ({
        section: "savings",
        label,
        amount: 0,
        isDefault: true,
        sortOrder: i + 1,
      })),
    ];
  }

  const plan = await prisma.spendingPlan.create({
    data: {
      userId,
      month,
      year,
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

  // Aggregate transaction-based fixed costs per plan
  const txns = await prisma.transaction.findMany({
    where: {
      import: { spendingPlanId: { in: planIds } },
      spendingCategory: "fixed_costs",
      isDuplicate: false,
      NOT: { type: "Payment" },
    },
    select: { amount: true, import: { select: { spendingPlanId: true } } },
  });

  const fcSubtotalByPlan: Record<string, number> = {};
  for (const t of txns) {
    const pid = t.import.spendingPlanId;
    fcSubtotalByPlan[pid] = (fcSubtotalByPlan[pid] ?? 0) + -Number(t.amount);
  }

  return plans.map((plan) => {
    const net = Number(plan.netMonthlyIncome);
    const safePercent = (v: number) => (net > 0 ? v / net : 0);

    const fcSubtotal = fcSubtotalByPlan[plan.id] ?? 0;
    const fcTotal = fcSubtotal + fcSubtotal * MISCELLANEOUS_RATE;

    const investmentItems = plan.lineItems.filter((i) => i.section === "investments");
    const savingsItems = plan.lineItems.filter((i) => i.section === "savings");
    const investmentsTotal = investmentItems.reduce((s, i) => s + Number(i.amount), 0);
    const savingsTotal = savingsItems.reduce((s, i) => s + Number(i.amount), 0);
    const guiltFreeTotal = net - fcTotal - investmentsTotal - savingsTotal;

    return {
      id: plan.id,
      month: plan.month,
      year: plan.year,
      netMonthlyIncome: net,
      totalNetWorth: Number(plan.assets) + Number(plan.investmentsNw) + Number(plan.savingsNw) - Number(plan.debt),
      fixedCostsPercentage: safePercent(fcTotal),
      investmentsPercentage: safePercent(investmentsTotal),
      savingsPercentage: safePercent(savingsTotal),
      guiltFreePercentage: safePercent(guiltFreeTotal),
      guiltFreeTotal,
      updatedAt: plan.updatedAt.toISOString(),
    };
  });
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
  createdAt: Date;
  updatedAt: Date;
  lineItems: Array<{
    id: string;
    spendingPlanId: string;
    section: string;
    label: string;
    amount: any;
    isDefault: boolean;
    sortOrder: number;
    createdAt: Date;
  }>;
}

function computeCalculations(plan: PlanWithLineItems): PlanCalculations {
  const netIncome = Number(plan.netMonthlyIncome);

  const fixedCostItems = plan.lineItems.filter(
    (i) => i.section === "fixed_costs"
  );
  const investmentItems = plan.lineItems.filter(
    (i) => i.section === "investments"
  );
  const savingsItems = plan.lineItems.filter((i) => i.section === "savings");

  const fixedCostsSubtotal = fixedCostItems.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const miscellaneous = fixedCostsSubtotal * MISCELLANEOUS_RATE;
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
    lineItems: plan.lineItems.map((item) => ({
      id: item.id,
      spendingPlanId: item.spendingPlanId,
      section: item.section as "fixed_costs" | "investments" | "savings",
      label: item.label,
      amount: Number(item.amount),
      isDefault: item.isDefault,
      sortOrder: item.sortOrder,
    })),
    calculations: computeCalculations(plan),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}
