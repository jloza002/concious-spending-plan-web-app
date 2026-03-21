import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateExcel } from "../services/excel-export.service.js";

export const exportRoutes = Router();

exportRoutes.use(requireAuth);

/** GET /plans/:id/export - Download spending plan as .xlsx */
exportRoutes.get("/:id/export", async (req, res, next) => {
  try {
    const buffer = await generateExcel(req.params.id, req.user!.sub);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Conscious-Spending-Plan.xlsx"`
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});
