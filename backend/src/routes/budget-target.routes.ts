import { Router } from "express";
import { getBudgetTargetsQuerySchema, setBudgetTargetsSchema } from "@csp/shared";
import { requireAuth } from "../middleware/auth.js";
import * as svc from "../services/budget-target.service.js";

export const budgetTargetRoutes = Router();

budgetTargetRoutes.use(requireAuth);

/** GET /budget-targets?month=&year= - this month's budget */
budgetTargetRoutes.get("/", async (req, res, next) => {
  try {
    const { month, year } = getBudgetTargetsQuerySchema.parse(req.query);
    const rows = await svc.getBudgetTargets(req.user!.sub, month, year);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** PUT /budget-targets - replace a month's budget (max 10 categories) */
budgetTargetRoutes.put("/", async (req, res, next) => {
  try {
    const { month, year, targets } = setBudgetTargetsSchema.parse(req.body);
    const rows = await svc.setBudgetTargets(req.user!.sub, month, year, targets);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
