import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import * as dashboardService from "../services/dashboard.service.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Comma-separated id list, silently dropping anything that isn't a well-formed UUID. */
function parseIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s));
}

/**
 * GET /dashboard/category-summary?planIds=&comparePlanIds=
 * Fixed-cost category actuals + budgeted amounts for a set of plans, and
 * actuals for a comparison set — feeds the dashboard's period-aware
 * Spending vs Plan chart, Top Movers card, and pie chart.
 */
dashboardRoutes.get("/category-summary", async (req, res, next) => {
  try {
    const { planIds, comparePlanIds } = z
      .object({ planIds: z.string().optional(), comparePlanIds: z.string().optional() })
      .parse(req.query);
    const summary = await dashboardService.getCategorySummary(
      req.user!.sub,
      parseIds(planIds),
      parseIds(comparePlanIds)
    );
    res.json(summary);
  } catch (err) {
    next(err);
  }
});
