import { z } from "zod";

/** Schema for creating/updating a category mapping */
export const categoryMappingSchema = z.object({
  descriptionNormalized: z.string().min(1),
  spendingCategory: z.enum(["fixed_costs", "investments", "savings", "guilt_free"]),
  spendingSubcategory: z.string().min(1),
});

export type CategoryMappingInput = z.infer<typeof categoryMappingSchema>;
