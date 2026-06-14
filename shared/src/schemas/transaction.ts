import { z } from "zod";

/** Allowed account types for a transaction */
export const accountTypeSchema = z.enum(["credit_card", "checking", "savings"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

/** Schema for a single parsed CSV transaction row */
export const csvTransactionSchema = z.object({
  transactionDate: z.string(),
  postDate: z.string(),
  description: z.string(),
  category: z.string().optional(),
  type: z.enum(["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"]),
  amount: z.number(),
  memo: z.string().optional(),
  accountType: accountTypeSchema.optional(),
});

/** Schema for bulk importing transactions */
export const importTransactionsSchema = z.object({
  transactions: z.array(csvTransactionSchema).min(1),
});

/** Schema for updating a transaction's category assignment */
export const assignCategorySchema = z.object({
  spendingCategory: z
    .enum(["fixed_costs", "investments", "savings", "guilt_free"])
    .nullable(),
  spendingSubcategory: z.string().nullable(),
});

/** Schema for auto-categorize request */
export const autoCategorizeRequestSchema = z.object({
  descriptions: z.array(z.string()),
});

/** Auto-categorize response item */
export const categorySuggestionSchema = z.object({
  description: z.string(),
  spendingCategory: z.string(),
  spendingSubcategory: z.string(),
  timesUsed: z.number(),
});

/** Schema for adding a single manual transaction */
export const manualTransactionSchema = z.object({
  transactionDate: z.string(),
  description: z.string().min(1),
  type: z.enum(["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"]).default("Sale"),
  amount: z.number(),
  memo: z.string().optional(),
});

/** Schema for updating a transaction's type */
export const updateTransactionTypeSchema = z.object({
  type: z.enum(["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"]),
});

export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;
export type CsvTransaction = z.infer<typeof csvTransactionSchema>;
export type ImportTransactionsInput = z.infer<typeof importTransactionsSchema>;
export type AssignCategoryInput = z.infer<typeof assignCategorySchema>;
export type AutoCategorizeRequest = z.infer<typeof autoCategorizeRequestSchema>;
export type CategorySuggestion = z.infer<typeof categorySuggestionSchema>;
export type UpdateTransactionTypeInput = z.infer<typeof updateTransactionTypeSchema>;
