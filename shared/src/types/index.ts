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

  // Line items grouped by section
  lineItems: PlanLineItem[];

  // Computed calculations
  calculations: PlanCalculations;

  createdAt: string;
  updatedAt: string;
}

export interface PlanLineItem {
  id: string;
  spendingPlanId: string;
  section: "fixed_costs" | "investments" | "savings";
  label: string;
  amount: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface Transaction {
  id: string;
  importId: string;
  transactionDate: string;
  postDate: string;
  description: string;
  originalCategory: string | null;
  type: "Sale" | "Return" | "Payment" | "Adjustment";
  amount: number;
  memo: string | null;
  spendingCategory: string | null;
  spendingSubcategory: string | null;
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
  fixedCostsPercentage: number;
  guiltFreeTotal: number;
  updatedAt: string;
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
