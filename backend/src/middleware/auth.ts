import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client.js";
import { AppError } from "./error-handler.js";

/** Decoded JWT payload */
export interface AuthUser {
  sub: string; // user ID
  email: string;
  name?: string;
  tv: number;  // tokenVersion — must match DB to prevent revoked tokens
}

/** Extend Express Request to include authenticated user */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to verify short-lived JWT access tokens.
 * Also validates tokenVersion against the DB to support session invalidation.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Missing or invalid authorization header", 401));
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new AppError("Server configuration error: JWT_SECRET not set", 500));
  }

  let decoded: AuthUser;
  try {
    decoded = jwt.verify(token, secret) as AuthUser;
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }

  // Validate tokenVersion to detect invalidated sessions (logout)
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { tokenVersion: true },
  });

  if (!user || user.tokenVersion !== decoded.tv) {
    return next(new AppError("Session has been invalidated. Please sign in again.", 401));
  }

  req.user = decoded;
  next();
}
