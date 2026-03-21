import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { assignCategorySchema } from "@csp/shared";
import * as importService from "../services/import.service.js";
import * as categoryMappingService from "../services/category-mapping.service.js";

export const transactionRoutes = Router();

transactionRoutes.use(requireAuth);

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
