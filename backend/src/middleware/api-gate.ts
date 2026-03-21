import type { Request, Response, NextFunction } from "express";

/**
 * Feature flag middleware for the disabled public API.
 * Returns 403 when API_ENABLED !== 'true'.
 */
export function apiGate(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.API_ENABLED !== "true") {
    res.status(403).json({
      error: "API Not Available",
      message:
        "The public API interface is under development. Please use the web application.",
      docs: "/api/v1/docs",
    });
    return;
  }
  next();
}
