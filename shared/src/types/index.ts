import type { PlanCalculations } from "../schemas/spending-plan";

/** Full spending plan with line items and calculations */
export interface SpendingPlan {
  id: string;
  userId: string;
  month: number;
  year: number;

  // Net Worth
  assets: number;
  investmentsNw: number;
  savingsNw: number;
  debt: number;

  // Income
  grossMonthlyIncome: number;
  netMonthlyIncome: number;

  // Settings
  includeMiscellaneous: boolean;
  notes: string | null;
  customTransactionTypes: string[];
  isLocked: boolean;

  // Line items grouped by section
  lineItems: PlanLineItem[];

  // Computed calculations
  calculations: PlanCalculations;

  createdAt: string;
  updatedAt: string;
}

/** A category in the user's library (shared across plans, scoped to user) */
export interface UserCategory {
  id: string;
  userId: string;
  section: "fixed_costs" | "investments" | "savings" | "income";
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A category's spending target for one month. `label` is denormalized from the
 * category so past months still render correctly after the category is
 * archived (soft-deleted) out of the library.
 */
export interface BudgetTarget {
  id: string;
  userCategoryId: string;
  label: string;
  month: number;
  year: number;
  amount: number;
}

export interface PlanLineItem {
  id: string;
  spendingPlanId: string;
  section: "fixed_costs" | "investments" | "savings" | "income";
  label: string;
  amount: number;
  isDefault: boolean;
  excluded: boolean;
  sortOrder: number;
}

export interface Transaction {
  id: string;
  importId: string;
  transactionDate: string;
  postDate: string;
  description: string;
  originalCategory: string | null;
  type: string;
  amount: number;
  memo: string | null;
  spendingCategory: string | null;
  spendingSubcategory: string | null;
  accountType: "credit_card" | "checking" | "savings" | null;
  isDuplicate: boolean;
  isManual: boolean;
}

export interface TransactionImport {
  id: string;
  spendingPlanId: string;
  importedAt: string;
  transactions: Transaction[];
}

export interface CategoryMapping {
  id: string;
  userId: string;
  descriptionNormalized: string;
  spendingCategory: string;
  spendingSubcategory: string;
  timesUsed: number;
  lastUsedAt: string;
}

/** Summary card data for the dashboard */
export interface PlanSummary {
  id: string;
  month: number;
  year: number;
  netMonthlyIncome: number;
  totalNetWorth: number;
  fixedCostsPercentage: number;
  investmentsPercentage: number;
  savingsPercentage: number;
  guiltFreePercentage: number;
  guiltFreeTotal: number;
  isLocked: boolean;
  updatedAt: string;
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
