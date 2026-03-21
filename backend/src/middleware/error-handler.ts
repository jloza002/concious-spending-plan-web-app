import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/** Central error handling middleware for Express */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid request data",
      details: err.errors,
    });
    return;
  }

  // Known application errors
  if ("statusCode" in err && typeof (err as any).statusCode === "number") {
    const statusCode = (err as any).statusCode;
    res.status(statusCode).json({
      error: err.name || "Error",
      message: err.message,
    });
    return;
  }

  // Unexpected errors
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
}

/** Helper to create typed application errors */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
