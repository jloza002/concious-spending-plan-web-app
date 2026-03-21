import { Router } from "express";
import { apiGate } from "../../middleware/api-gate.js";

export const apiV1Routes = Router();

// Gate all v1 routes behind the feature flag
apiV1Routes.use(apiGate);

// OpenAPI docs endpoint (always accessible, even when gated)
// In a full implementation, this would serve the OpenAPI spec
apiV1Routes.get("/docs", (_req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "IWT Conscious Spending Plan API",
      version: "1.0.0",
      description:
        "Public API for the IWT Conscious Spending Plan. Currently under development.",
    },
    paths: {
      "/api/v1/plans": {
        get: {
          summary: "List spending plans",
          description: "Returns all spending plans for the authenticated user.",
          security: [{ apiKey: [] }],
          responses: {
            "200": { description: "List of plans" },
            "401": { description: "Unauthorized" },
            "403": { description: "API not enabled" },
          },
        },
        post: {
          summary: "Create a spending plan",
          description: "Create a new spending plan for a given month/year.",
          security: [{ apiKey: [] }],
          responses: {
            "201": { description: "Plan created" },
            "409": { description: "Plan already exists for this month" },
          },
        },
      },
      "/api/v1/plans/{id}": {
        get: {
          summary: "Get a spending plan",
          description:
            "Returns a single spending plan with all line items and calculations.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          security: [{ apiKey: [] }],
          responses: {
            "200": { description: "Plan details" },
            "404": { description: "Plan not found" },
          },
        },
      },
      "/api/v1/plans/{id}/export": {
        get: {
          summary: "Export plan as Excel",
          description: "Download the spending plan as a .xlsx file.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          security: [{ apiKey: [] }],
          responses: {
            "200": {
              description: "Excel file",
              content: {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  {},
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
  });
});

// Placeholder route handlers (fully architected but gated)
apiV1Routes.get("/plans", (_req, res) => {
  res.json({ message: "List plans - implementation ready" });
});

apiV1Routes.post("/plans", (_req, res) => {
  res.status(201).json({ message: "Create plan - implementation ready" });
});

apiV1Routes.get("/plans/:id", (req, res) => {
  res.json({ message: `Get plan ${req.params.id} - implementation ready` });
});

apiV1Routes.get("/plans/:id/export", (req, res) => {
  res.json({
    message: `Export plan ${req.params.id} - implementation ready`,
  });
});
