import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { planRoutes } from "./routes/plan.routes.js";
import { lineItemRoutes } from "./routes/line-item.routes.js";
import { importRoutes } from "./routes/import.routes.js";
import { transactionRoutes } from "./routes/transaction.routes.js";
import { categoryMappingRoutes } from "./routes/category-mapping.routes.js";
import { exportRoutes } from "./routes/export.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { apiV1Routes } from "./routes/api-v1/index.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use("/auth", authRoutes);

// API routes (authenticated)
app.use("/plans", planRoutes);
app.use("/plans", lineItemRoutes);
app.use("/plans", importRoutes);
app.use("/transactions", transactionRoutes);
app.use("/category-mappings", categoryMappingRoutes);
app.use("/plans", exportRoutes);

// Disabled public API (v1)
app.use("/api/v1", apiV1Routes);

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CSP Backend running on port ${PORT}`);
});

export default app;
