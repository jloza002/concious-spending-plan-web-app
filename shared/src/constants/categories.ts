/**
 * Default spending plan categories and subcategories.
 * These mirror the IWT Conscious Spending Plan Excel template.
 */

export const PLAN_SECTIONS = {
  FIXED_COSTS: "fixed_costs",
  INVESTMENTS: "investments",
  SAVINGS: "savings",
  GUILT_FREE: "guilt_free",
  INCOME: "income",
} as const;

export type PlanSection = (typeof PLAN_SECTIONS)[keyof typeof PLAN_SECTIONS];

/**
 * Recommended percentage ranges per section. Income has no target range — it's
 * the baseline every other percentage is measured against, not a % of itself —
 * so it's deliberately excluded from this map's keys (not just left undefined).
 */
export const SECTION_RANGES: Record<
  Exclude<PlanSection, typeof PLAN_SECTIONS.INCOME>,
  { min: number; max: number; label: string }
> = {
  [PLAN_SECTIONS.FIXED_COSTS]: {
    min: 50,
    max: 60,
    label: "Fixed Costs (50-60%)",
  },
  [PLAN_SECTIONS.INVESTMENTS]: {
    min: 10,
    max: 10,
    label: "Investments (10%)",
  },
  [PLAN_SECTIONS.SAVINGS]: {
    min: 5,
    max: 10,
    label: "Savings Goals (5-10%)",
  },
  [PLAN_SECTIONS.GUILT_FREE]: {
    min: 20,
    max: 35,
    label: "Guilt-Free Spending (20-35%)",
  },
};

/** Miscellaneous auto-calculation rate (15% of fixed costs subtotal) */
export const MISCELLANEOUS_RATE = 0.15;

/** Default Fixed Costs subcategories */
export const DEFAULT_FIXED_COSTS = [
  "Rent / Mortgage",
  "Utilities (gas, water, electric, internet, cable, etc.)",
  "Insurance (medical, auto, home / renters, etc.)",
  "Car Payment / Transportation",
  "Debt Payments",
  "Groceries",
  "Clothes",
  "Phone",
  "Subscriptions (Netflix, gym membership, meal services, Amazon, etc.)",
];

/** Default Investments subcategories */
export const DEFAULT_INVESTMENTS = [
  "Post-Tax Retirement Savings",
  "Stocks",
];

/** Default Savings Goals subcategories */
export const DEFAULT_SAVINGS = [
  "Vacations",
  "Gifts",
  "Long Term Emergency Fund",
];

/** Default Income subcategories — for tagging deposit (positive-amount) transactions */
export const DEFAULT_INCOME = [
  "Paycheck / Salary",
  "Side Income",
  "Gifts / Reimbursements",
  "Transfers (Zelle / Venmo / Cash App)",
  "Interest / Dividends",
];

/** Net Worth field labels */
export const NET_WORTH_FIELDS = [
  "Assets",
  "Investments",
  "Savings",
  "Debt",
] as const;

/** Transaction types from CSV */
export const TRANSACTION_TYPES = [
  "Sale",
  "Return",
  "Payment",
  "Adjustment",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
