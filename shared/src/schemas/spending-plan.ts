import { z } from "zod";

/** Schema for creating a new spending plan */
export const createPlanSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  copyFromPlanId: z.string().uuid().optional(),
});

/** Schema for updating a spending plan's top-level fields */
export const updatePlanSchema = z.object({
  // Net Worth
  assets: z.number().optional(),
  investmentsNw: z.number().optional(),
  savingsNw: z.number().optional(),
  debt: z.number().optional(),
  // Income
  grossMonthlyIncome: z.number().optional(),
  netMonthlyIncome: z.number().optional(),
  // Settings
  includeMiscellaneous: z.boolean().optional(),
});

/** Schema for creating/updating a line item */
export const lineItemSchema = z.object({
  section: z.enum(["fixed_costs", "investments", "savings"]),
  label: z.string().min(1).max(255),
  amount: z.number().default(0),
  sortOrder: z.number().int().optional(),
});

export const updateLineItemSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  amount: z.number().optional(),
  sortOrder: z.number().int().optional(),
});

/** Reorder request: array of { id, sortOrder } */
export const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    })
  ),
});

/** Calculated plan response (returned by API) */
export const planCalculationsSchema = z.object({
  fixedCostsSubtotal: z.number(),
  miscellaneous: z.number(),
  fixedCostsTotal: z.number(),
  fixedCostsPercentage: z.number(),
  investmentsTotal: z.number(),
  investmentsPercentage: z.number(),
  savingsTotal: z.number(),
  savingsPercentage: z.number(),
  guiltFreeTotal: z.number(),
  guiltFreePercentage: z.number(),
  totalNetWorth: z.number(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
export type PlanCalculations = z.infer<typeof planCalculationsSchema>;
