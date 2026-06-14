import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import * as svc from "../services/user-category.service.js";

export const userCategoryRoutes = Router();

userCategoryRoutes.use(requireAuth);

const sectionEnum = z.enum(["fixed_costs", "investments", "savings"]);

/** GET /user-categories - list the user's category library */
userCategoryRoutes.get("/", async (req, res, next) => {
  try {
    const rows = await svc.listUserCategories(req.user!.sub);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** POST /user-categories - add a new category to the library (cascades to unlocked plans) */
userCategoryRoutes.post("/", async (req, res, next) => {
  try {
    const data = z
      .object({ section: sectionEnum, label: z.string().min(1).max(255) })
      .parse(req.body);
    const created = await svc.addUserCategory(req.user!.sub, data.section, data.label);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** PATCH /user-categories/:id - rename a category (cascades to unlocked plans) */
userCategoryRoutes.patch("/:id", async (req, res, next) => {
  try {
    const { newLabel } = z.object({ newLabel: z.string().min(1).max(255) }).parse(req.body);
    const updated = await svc.renameUserCategory(req.user!.sub, req.params.id, newLabel);
    if (!updated) return res.status(404).json({ error: "Not Found", message: "Category not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /user-categories/:id - delete a category (cascades to unlocked plans) */
userCategoryRoutes.delete("/:id", async (req, res, next) => {
  try {
    const result = await svc.deleteUserCategory(req.user!.sub, req.params.id);
    if (!result) return res.status(404).json({ error: "Not Found", message: "Category not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
