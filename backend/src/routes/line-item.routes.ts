import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { lineItemSchema, updateLineItemSchema, reorderItemsSchema } from "@csp/shared";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import * as planService from "../services/plan.service.js";
import * as userCategoryService from "../services/user-category.service.js";
import { recomputeNetIncome } from "../services/net-income.service.js";

/** Verify ownership and reject when the plan is locked. */
async function loadUnlockedPlanOrThrow(planId: string, userId: string) {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true, isLocked: true },
  });
  if (!plan) throw new AppError("Spending plan not found", 404);
  if (plan.isLocked) throw new AppError("This plan is locked — unlock it to edit categories.", 409);
  return plan;
}

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

/** POST /plans/:id/items - Add a new subcategory; cascades to the user's library and unlocked plans */
lineItemRoutes.post("/:id/items", async (req, res, next) => {
  try {
    const planId = req.params.id;
    const userId = req.user!.sub;
    const data = lineItemSchema.parse(req.body);

    await loadUnlockedPlanOrThrow(planId, userId);

    // Adding to the library propagates to every unlocked plan, including this one.
    await userCategoryService.addUserCategory(userId, data.section, data.label);

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

    // The exclude toggle (or any other edit) on an income line can change
    // which transactions count toward net income.
    if (item.section === "income") {
      await recomputeNetIncome(planId);
    }

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** DELETE /plans/:id/items/:itemId - Delete from the user's library; cascades to all unlocked plans */
lineItemRoutes.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { id: planId, itemId } = req.params;
    const userId = req.user!.sub;

    await loadUnlockedPlanOrThrow(planId, userId);

    const item = await prisma.planLineItem.findUnique({
      where: { id: itemId },
      include: { spendingPlan: true },
    });
    if (!item || item.spendingPlanId !== planId || item.spendingPlan.userId !== userId) {
      throw new AppError("Line item not found", 404);
    }

    const userCat = await prisma.userCategory.findFirst({
      where: { userId, section: item.section, label: item.label, deletedAt: null },
    });
    if (userCat) {
      await userCategoryService.deleteUserCategory(userId, userCat.id);
    } else {
      // Library row missing (legacy / orphan) — fall back to a per-plan delete so the
      // user can still clean it up.
      await prisma.transaction.updateMany({
        where: {
          import: { spendingPlanId: item.spendingPlanId },
          spendingCategory: item.section,
          spendingSubcategory: item.label,
        },
        data: { spendingCategory: null, spendingSubcategory: null },
      });
      await prisma.planLineItem.delete({ where: { id: itemId } });
      if (item.section === "income") {
        await recomputeNetIncome(item.spendingPlanId);
      }
    }

    const updatedPlan = await planService.getPlan(planId, userId);
    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/** PATCH /plans/:id/items/:itemId/rename - Rename in the user's library; cascades to all unlocked plans */
lineItemRoutes.patch("/:id/items/:itemId/rename", async (req, res, next) => {
  try {
    const { id: planId, itemId } = req.params;
    const userId = req.user!.sub;
    const { newLabel } = z.object({ newLabel: z.string().min(1).max(255) }).parse(req.body);

    await loadUnlockedPlanOrThrow(planId, userId);

    const item = await prisma.planLineItem.findUnique({
      where: { id: itemId },
      include: { spendingPlan: true },
    });
    if (!item || item.spendingPlanId !== planId || item.spendingPlan.userId !== userId) {
      throw new AppError("Line item not found", 404);
    }

    const userCat = await prisma.userCategory.findFirst({
      where: { userId, section: item.section, label: item.label, deletedAt: null },
    });
    if (userCat) {
      await userCategoryService.renameUserCategory(userId, userCat.id, newLabel);
    } else if (item.label !== newLabel) {
      // Library row missing (legacy / orphan) — fall back to per-plan rename so the
      // current plan still gets updated.
      await prisma.$transaction([
        prisma.planLineItem.update({ where: { id: itemId }, data: { label: newLabel } }),
        prisma.transaction.updateMany({
          where: {
            import: { spendingPlanId: planId },
            spendingSubcategory: item.label,
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
