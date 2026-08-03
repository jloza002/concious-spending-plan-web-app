import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  assignCategorySchema,
  updateTransactionTypeSchema,
  accountTypeSchema,
  bulkDeleteTransactionsSchema,
} from "@csp/shared";
import * as importService from "../services/import.service.js";
import * as categoryMappingService from "../services/category-mapping.service.js";

export const transactionRoutes = Router();

transactionRoutes.use(requireAuth);

/** PATCH /transactions/:id/type - Update transaction type */
transactionRoutes.patch("/:id/type", async (req, res, next) => {
  try {
    const { type } = updateTransactionTypeSchema.parse(req.body);
    const transaction = await importService.updateTransactionType(req.params.id, req.user!.sub, type);
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

/** PATCH /transactions/:id/account-type - Update transaction account type */
transactionRoutes.patch("/:id/account-type", async (req, res, next) => {
  try {
    const { accountType } = z
      .object({ accountType: accountTypeSchema.nullable() })
      .parse(req.body);
    const transaction = await importService.updateTransactionAccountType(
      req.params.id,
      req.user!.sub,
      accountType
    );
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

/** DELETE /transactions/:id - Delete a transaction */
transactionRoutes.delete("/:id", async (req, res, next) => {
  try {
    await importService.deleteTransaction(req.params.id, req.user!.sub);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** POST /transactions/bulk-delete - Soft-delete several transactions at once */
transactionRoutes.post("/bulk-delete", async (req, res, next) => {
  try {
    const { transactionIds } = bulkDeleteTransactionsSchema.parse(req.body);
    await importService.bulkDeleteTransactions(transactionIds, req.user!.sub);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** PATCH /transactions/:id/restore - Restore a soft-deleted transaction */
transactionRoutes.patch("/:id/restore", async (req, res, next) => {
  try {
    await importService.restoreTransaction(req.params.id, req.user!.sub);
    res.json({ message: "Transaction restored" });
  } catch (err) {
    next(err);
  }
});

/** PUT /transactions/:id - Update transaction category assignment */
transactionRoutes.put("/:id", async (req, res, next) => {
  try {
    const data = assignCategorySchema.parse(req.body);
    const transaction = await importService.assignCategory(
      req.params.id,
      req.user!.sub,
      data.spendingCategory,
      data.spendingSubcategory
    );

    // Also save to category memory if a category was assigned
    if (data.spendingCategory) {
      await categoryMappingService.saveMappingFromDescription(
        req.user!.sub,
        (transaction as any).description,
        data.spendingCategory,
        data.spendingSubcategory ?? ""
      );
    }

    res.json(transaction);
  } catch (err) {
    next(err);
  }
});
