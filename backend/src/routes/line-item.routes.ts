import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { lineItemSchema, updateLineItemSchema, reorderItemsSchema } from "@csp/shared";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import * as planService from "../services/plan.service.js";

export const lineItemRoutes = Router();

lineItemRoutes.use(requireAuth);

/** PATCH /plans/:id/transaction-types - Add or remove a custom transaction type */
lineItemRoutes.patch("/:id/transaction-types", async (req, res, next) => {
  try {
    const { id: planId } = req.params;
    const userId = req.user!.sub;
    const { action, type } = z.object({
      action: z.enum(["add", "remove"]),
      type: z.string().min(1).max(50),
    }).parse(req.body);

    const plan = await prisma.spendingPlan.findFirst({
      where: { id: planId, userId },
      select: { id: true, customTransactionTypes: true },
    });
    if (!plan) throw new AppError("Spending plan not found", 404);

    const updated =
      action === "add"
        ? plan.customTransactionTypes.includes(type)
          ? plan.customTransactionTypes
          : [...plan.customTransactionTypes, type]
        : plan.customTransactionTypes.filter((t) => t !== type);

    await prisma.spendingPlan.update({
      where: { id: planId },
      data: { customTransactionTypes: updated },
    });

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** POST /plans/:id/items - Add a new subcategory line item */
lineItemRoutes.post("/:id/items", async (req, res, next) => {
  try {
    const planId = req.params.id;
    const userId = req.user!.sub;
    const data = lineItemSchema.parse(req.body);

    // Verify ownership
    const plan = await prisma.spendingPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) throw new AppError("Spending plan not found", 404);

    // Determine sort order if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const maxItem = await prisma.planLineItem.findFirst({
        where: { spendingPlanId: planId, section: data.section },
        orderBy: { sortOrder: "desc" },
      });
      sortOrder = (maxItem?.sortOrder ?? 0) + 1;
    }

    await prisma.planLineItem.create({
      data: {
        spendingPlanId: planId,
        section: data.section,
        label: data.label,
        amount: data.amount,
        isDefault: false,
        sortOrder,
      },
    });

    // Return updated plan
    const updatedPlan = await planService.getPlan(planId, userId);
    res.status(201).json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** PUT /plans/:id/items/:itemId - Update a line item */
lineItemRoutes.put("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { id: planId, itemId } = req.params;
    const userId = req.user!.sub;
    const data = updateLineItemSchema.parse(req.body);

    // Verify ownership and plan membership
    const item = await prisma.planLineItem.findUnique({
      where: { id: itemId },
      include: { spendingPlan: true },
    });
    if (!item || item.spendingPlanId !== planId || item.spendingPlan.userId !== userId) {
      throw new AppError("Line item not found", 404);
    }

    await prisma.planLineItem.update({
      where: { id: itemId },
      data,
    });

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** DELETE /plans/:id/items/:itemId - Remove a custom line item */
lineItemRoutes.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { id: planId, itemId } = req.params;
    const userId = req.user!.sub;

    const item = await prisma.planLineItem.findUnique({
      where: { id: itemId },
      include: { spendingPlan: true },
    });
    if (!item || item.spendingPlanId !== planId || item.spendingPlan.userId !== userId) {
      throw new AppError("Line item not found", 404);
    }

    // Clear transaction references to this deleted category
    await prisma.transaction.updateMany({
      where: {
        import: { spendingPlanId: item.spendingPlanId },
        spendingCategory: item.section,
        spendingSubcategory: item.label,
      },
      data: { spendingCategory: null, spendingSubcategory: null },
    });

    await prisma.planLineItem.delete({ where: { id: itemId } });

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** PATCH /plans/:id/items/:itemId/rename - Rename a line item and update all referencing transactions */
lineItemRoutes.patch("/:id/items/:itemId/rename", async (req, res, next) => {
  try {
    const { id: planId, itemId } = req.params;
    const userId = req.user!.sub;
    const { newLabel } = z.object({ newLabel: z.string().min(1).max(255) }).parse(req.body);

    const item = await prisma.planLineItem.findUnique({
      where: { id: itemId },
      include: { spendingPlan: true },
    });
    if (!item || item.spendingPlanId !== planId || item.spendingPlan.userId !== userId) {
      throw new AppError("Line item not found", 404);
    }

    const oldLabel = item.label;
    if (oldLabel !== newLabel) {
      await prisma.$transaction([
        prisma.planLineItem.update({
          where: { id: itemId },
          data: { label: newLabel },
        }),
        prisma.transaction.updateMany({
          where: {
            import: { spendingPlanId: planId },
            spendingSubcategory: oldLabel,
          },
          data: { spendingSubcategory: newLabel },
        }),
      ]);
    }

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** PATCH /plans/:id/items/reorder - Reorder line items */
lineItemRoutes.patch("/:id/items/reorder", async (req, res, next) => {
  try {
    const { id: planId } = req.params;
    const userId = req.user!.sub;
    const { items } = reorderItemsSchema.parse(req.body);

    const plan = await prisma.spendingPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) throw new AppError("Spending plan not found", 404);

    await prisma.$transaction(
      items.map((item) =>
        prisma.planLineItem.updateMany({
          where: { id: item.id, spendingPlanId: planId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});
