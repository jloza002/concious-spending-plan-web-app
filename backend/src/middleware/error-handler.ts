import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * `instanceof ZodError` alone is not reliable here. @csp/shared is built as
 * CommonJS while this server runs as ESM, so a schema defined in shared throws
 * the ZodError from zod's CJS build while this module holds the ESM one — two
 * distinct classes, so instanceof returns false and a plain validation failure
 * would surface as a 500. Match on shape as well so validation errors from
 * shared schemas are reported as 400s like any other.
 */
function isZodError(err: unknown): err is ZodError {
  if (err instanceof ZodError) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

/** Central error handling middleware for Express */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (isZodError(err)) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid request data",
      details: err.issues,
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

  // Unexpected errors — never leak internals to the client
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred. Please try again later.",
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
