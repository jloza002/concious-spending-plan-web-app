import rateLimit from "express-rate-limit";

/** 10 requests per 15 minutes for auth endpoints (login, register, forgot-password) */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Too many attempts. Please try again later." },
  skipSuccessfulRequests: false,
});

/** 20 requests per 15 minutes for resend/refresh (slightly more lenient) */
export const softRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Too many requests. Please try again later." },
});

/** 5 import operations per hour per IP */
export const importRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Import limit reached. Please wait before importing again." },
});
