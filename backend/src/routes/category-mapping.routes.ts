import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { categoryMappingSchema } from "@csp/shared";
import * as service from "../services/category-mapping.service.js";

export const categoryMappingRoutes = Router();

categoryMappingRoutes.use(requireAuth);

/** GET /category-mappings - Get all saved mappings */
categoryMappingRoutes.get("/", async (req, res, next) => {
  try {
    const mappings = await service.getMappings(req.user!.sub);
    res.json(mappings);
  } catch (err) {
    next(err);
  }
});

/** POST /category-mappings - Save a new mapping */
categoryMappingRoutes.post("/", async (req, res, next) => {
  try {
    const data = categoryMappingSchema.parse(req.body);
    const mapping = await service.saveMappingFromDescription(
      req.user!.sub,
      data.descriptionNormalized,
      data.spendingCategory,
      data.spendingSubcategory
    );
    res.status(201).json(mapping);
  } catch (err) {
    next(err);
  }
});

/** DELETE /category-mappings/:id - Delete a mapping */
categoryMappingRoutes.delete("/:id", async (req, res, next) => {
  try {
    await service.deleteMapping(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
