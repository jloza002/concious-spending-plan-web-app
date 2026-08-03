import { z } from "zod";

/** Most fixed-cost categories a user can budget in a single month. */
export const MAX_BUDGET_CATEGORIES = 10;

/** One category's spending target for a month. */
export const budgetTargetItemSchema = z.object({
  userCategoryId: z.string().uuid(),
  amount: z.number().min(0).max(99999999.99),
});

/**
 * Replaces a whole month's budget in one write. The client always sends the
 * complete set of targets for that month, so the cap is a plain array-length
 * check and there is no add/remove race to reconcile.
 */
export const setBudgetTargetsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  targets: z
    .array(budgetTargetItemSchema)
    .max(
      MAX_BUDGET_CATEGORIES,
      `You can budget up to ${MAX_BUDGET_CATEGORIES} categories per month`
    )
    .refine(
      (items) =>
        new Set(items.map((i) => i.userCategoryId)).size === items.length,
      { message: "The same category appears more than once" }
    ),
});

export const getBudgetTargetsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type BudgetTargetItemInput = z.infer<typeof budgetTargetItemSchema>;
export type SetBudgetTargetsInput = z.infer<typeof setBudgetTargetsSchema>;
export type GetBudgetTargetsQuery = z.infer<typeof getBudgetTargetsQuerySchema>;
