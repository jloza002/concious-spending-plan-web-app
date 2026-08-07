import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { authRateLimiter, softRateLimiter } from "./middleware/rate-limiter.js";
import { planRoutes } from "./routes/plan.routes.js";
import { lineItemRoutes } from "./routes/line-item.routes.js";
import { importRoutes } from "./routes/import.routes.js";
import { transactionRoutes } from "./routes/transaction.routes.js";
import { categoryMappingRoutes } from "./routes/category-mapping.routes.js";
import { exportRoutes } from "./routes/export.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { userCategoryRoutes } from "./routes/user-category.routes.js";
import { budgetTargetRoutes } from "./routes/budget-target.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { apiV1Routes } from "./routes/api-v1/index.js";

const app = express();
const PORT = process.env.PORT || 4000;

// ── Trust proxy (required for correct IP behind Koyeb/Railway reverse proxy) ──
app.set("trust proxy", 1);

// ── Security headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,       // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS: string[] = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (no Origin header) — these come from
      // Vercel/Koyeb server-side functions proxying requests; JWT auth protects all endpoints.
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Request timeout ────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: "Request Timeout", message: "Request took too long." });
  });
  next();
});

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth routes (rate-limited, public) ────────────────────────────────────
app.post("/auth/register", authRateLimiter);
app.post("/auth/login", authRateLimiter);
app.post("/auth/forgot-password", authRateLimiter);
app.post("/auth/reset-password", authRateLimiter);
app.post("/auth/refresh", softRateLimiter);
app.use("/auth", authRoutes);

// ── Authenticated API routes ───────────────────────────────────────────────
app.use("/users", userRoutes);
app.use("/plans", planRoutes);
app.use("/plans", lineItemRoutes);
app.use("/plans", importRoutes);
app.use("/transactions", transactionRoutes);
app.use("/category-mappings", categoryMappingRoutes);
app.use("/user-categories", userCategoryRoutes);
app.use("/budget-targets", budgetTargetRoutes);
app.use("/plans", exportRoutes);
app.use("/dashboard", dashboardRoutes);

// ── Disabled public API (v1) ───────────────────────────────────────────────
app.use("/api/v1", apiV1Routes);

// ── Error handling (must be last) ─────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CSP Backend running on port ${PORT}`);
});

export default app;
