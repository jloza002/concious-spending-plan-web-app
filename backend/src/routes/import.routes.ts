import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { importRateLimiter } from "../middleware/rate-limiter.js";
import { importTransactionsSchema, autoCategorizeRequestSchema, manualTransactionSchema } from "@csp/shared";
import * as importService from "../services/import.service.js";

export const importRoutes = Router();

importRoutes.use(requireAuth);

/** POST /plans/:id/import - Import parsed CSV transactions (rate-limited to 50/hr) */
importRoutes.post("/:id/import", importRateLimiter, async (req, res, next) => {
  try {
    const data = importTransactionsSchema.parse(req.body);
    const result = await importService.importTransactions(
      req.params.id as string,
      req.user!.sub,
      data.transactions
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /plans/:id/transactions - Get all transactions for a plan */
importRoutes.get("/:id/transactions", async (req, res, next) => {
  try {
    const transactions = await importService.getTransactions(
      req.params.id,
      req.user!.sub
    );
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

/** GET /plans/:id/transactions/deleted - Get soft-deleted transactions */
importRoutes.get("/:id/transactions/deleted", async (req, res, next) => {
  try {
    const transactions = await importService.getDeletedTransactions(
      req.params.id,
      req.user!.sub
    );
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

/** POST /plans/:id/transaction - Add a manual transaction */
importRoutes.post("/:id/transaction", async (req, res, next) => {
  try {
    const data = manualTransactionSchema.parse(req.body);
    const result = await importService.addManualTransaction(req.params.id, req.user!.sub, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/** DELETE /plans/:id/transactions - Permanently delete all transactions for a plan */
importRoutes.delete("/:id/transactions", async (req, res, next) => {
  try {
    await importService.deleteAllTransactions(req.params.id, req.user!.sub);
    res.json({ message: "All transactions deleted." });
  } catch (err) {
    next(err);
  }
});

/** POST /plans/:id/auto-categorize - Auto-categorize using memory */
importRoutes.post("/:id/auto-categorize", async (req, res, next) => {
  try {
    const { descriptions } = autoCategorizeRequestSchema.parse(req.body);
    const suggestions = await importService.autoCategorize(
      req.user!.sub,
      descriptions
    );
    // Convert Map to plain object for JSON serialization
    const result: Record<string, any> = {};
    suggestions.forEach((value, key) => {
      result[key] = value;
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
