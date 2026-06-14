import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createPlanSchema, updatePlanSchema } from "@csp/shared";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import * as planService from "../services/plan.service.js";

export const planRoutes = Router();

// All plan routes require authentication
planRoutes.use(requireAuth);

/** GET /plans - List all plans for the authenticated user */
planRoutes.get("/", async (req, res, next) => {
  try {
    const plans = await planService.listPlans(req.user!.sub);
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

/** POST /plans - Create a new spending plan */
planRoutes.post("/", async (req, res, next) => {
  try {
    const data = createPlanSchema.parse(req.body);
    const plan = await planService.createPlan(
      req.user!.sub,
      data.month,
      data.year,
      data.copyFromPlanId
    );
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

/** GET /plans/:id - Get a single plan with calculations */
planRoutes.get("/:id", async (req, res, next) => {
  try {
    const plan = await planService.getPlan(req.params.id, req.user!.sub);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

/** PUT /plans/:id - Update plan top-level fields */
planRoutes.put("/:id", async (req, res, next) => {
  try {
    const data = updatePlanSchema.parse(req.body);
    const plan = await planService.updatePlan(
      req.params.id,
      req.user!.sub,
      data
    );
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

/** DELETE /plans/:id - Delete a spending plan */
planRoutes.delete("/:id", async (req, res, next) => {
  try {
    await planService.deletePlan(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** PATCH /plans/:id/lock - Lock or unlock a plan to control category cascade */
planRoutes.patch("/:id/lock", async (req, res, next) => {
  try {
    const { isLocked } = z.object({ isLocked: z.boolean() }).parse(req.body);
    const userId = req.user!.sub;
    const planId = req.params.id;
    const existing = await prisma.spendingPlan.findFirst({
      where: { id: planId, userId },
      select: { id: true },
    });
    if (!existing) throw new AppError("Spending plan not found", 404);
    await prisma.spendingPlan.update({ where: { id: planId }, data: { isLocked } });
    const updated = await planService.getPlan(planId, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
