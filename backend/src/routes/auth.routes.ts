import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLog } from "../services/audit.service.js";
import { DEFAULT_FIXED_COSTS, DEFAULT_INVESTMENTS, DEFAULT_SAVINGS } from "@csp/shared";

export const authRoutes = Router();

// ── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
// Grace window during which an already-rotated (revoked) refresh token is still
// accepted. Concurrent requests (e.g. a CSV import firing several calls at once)
// can each try to refresh with the same token; without this, the first rotates it
// and the rest 401 — silently killing the session mid-action.
const REFRESH_GRACE_MS = 30_000;

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was the make of your first car?",
  "What is the name of the street you grew up on?",
] as const;

// ── Schemas ────────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Password must contain at least one lowercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain at least one number")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "Password must contain at least one special character");

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleInitial: z.string().max(5).optional(),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: passwordSchema,
  securityQuestion: z.string().min(1).max(255),
  securityAnswer: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Issue a signed JWT access token */
function issueAccessToken(userId: string, email: string, name: string | null, tokenVersion: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError("Server configuration error: JWT_SECRET not set", 500);
  return jwt.sign(
    { sub: userId, email, name, tv: tokenVersion },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/** Create and persist a refresh token, return the raw (unhashed) value */
async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
}

function getClientIp(req: import("express").Request): string {
  return (
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

// ── Routes ─────────────────────────────────────────────────────────────────

/** POST /auth/register */
authRoutes.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError("An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const securityAnswerHash = await bcrypt.hash(data.securityAnswer.toLowerCase().trim(), BCRYPT_ROUNDS);

    const mi = data.middleInitial?.trim();
    const fullName = [data.firstName.trim(), mi ? `${mi}.` : null, data.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        middleInitial: mi || null,
        lastName: data.lastName.trim(),
        name: fullName,
        email: data.email,
        passwordHash,
        emailVerified: new Date(), // Auto-verify — no email required
        securityQuestion: data.securityQuestion,
        securityAnswerHash,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Seed the user's category library with the defaults
    const seedRows = [
      ...DEFAULT_FIXED_COSTS.map((label, i) => ({ userId: user.id, section: "fixed_costs", label, sortOrder: i + 1 })),
      ...DEFAULT_INVESTMENTS.map((label, i) => ({ userId: user.id, section: "investments", label, sortOrder: i + 1 })),
      ...DEFAULT_SAVINGS.map((label, i) => ({ userId: user.id, section: "savings", label, sortOrder: i + 1 })),
    ];
    await prisma.userCategory.createMany({ data: seedRows, skipDuplicates: true });

    res.status(201).json({ ...user, message: "Account created! You can now sign in." });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/login */
authRoutes.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Constant-time failure to prevent timing attacks
    const dummyHash = "$2b$12$invalidhashpaddingtomatchbcrypttiming";
    const valid = user?.passwordHash
      ? await bcrypt.compare(data.password, user.passwordHash)
      : await bcrypt.compare(data.password, dummyHash).then(() => false);

    if (!user || !valid) throw new AppError("Invalid email or password", 401);

    const accessToken = issueAccessToken(user.id, user.email, user.name, user.tokenVersion);
    const refreshToken = await issueRefreshToken(user.id);

    await auditLog({
      userId: user.id,
      action: "login",
      resource: "auth",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/refresh — exchange a valid refresh token for a new access token */
authRoutes.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken: raw } = z.object({ refreshToken: z.string() }).parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true, tokenVersion: true } } },
    });

    const now = new Date();
    const revokedRecently =
      record?.revokedAt && now.getTime() - record.revokedAt.getTime() < REFRESH_GRACE_MS;
    if (!record || record.expiresAt < now || (record.revokedAt && !revokedRecently)) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Rotate: revoke old (unless a racing request already did within the grace
    // window), issue new.
    if (!record.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now },
      });
    }

    const { user } = record;
    const accessToken = issueAccessToken(user.id, user.email, user.name, user.tokenVersion);
    const newRefreshToken = await issueRefreshToken(user.id);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/logout — invalidate session */
authRoutes.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;

    // Increment tokenVersion — all existing JWTs for this user become invalid
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    // Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await auditLog({
      userId,
      action: "logout",
      resource: "auth",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Signed out successfully." });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/security-questions — list of available security questions */
authRoutes.get("/security-questions", (_req, res) => {
  res.json({ questions: SECURITY_QUESTIONS });
});

/** POST /auth/forgot-password — return the user's security question by email */
authRoutes.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { securityQuestion: true },
    });

    if (!user) {
      throw new AppError("No account found with this email address.", 404);
    }

    if (!user.securityQuestion) {
      throw new AppError("This account does not have a security question set up. Please contact support.", 400);
    }

    res.json({ question: user.securityQuestion });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/reset-password — verify security answer and reset password */
authRoutes.post("/reset-password", async (req, res, next) => {
  try {
    const { email, securityAnswer, newPassword } = z.object({
      email: z.string().email(),
      securityAnswer: z.string().min(1),
      newPassword: passwordSchema,
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.securityAnswerHash) {
      throw new AppError("Account not found or security question not set.", 400);
    }

    const answerValid = await bcrypt.compare(
      securityAnswer.toLowerCase().trim(),
      user.securityAnswerHash
    );

    if (!answerValid) {
      throw new AppError("Incorrect security answer.", 401);
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password, increment tokenVersion to invalidate all sessions, revoke refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await auditLog({
      userId: user.id,
      action: "password_reset",
      resource: "auth",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (err) {
    next(err);
  }
});
