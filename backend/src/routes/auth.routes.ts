import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js";
import { auditLog } from "../services/audit.service.js";

export const authRoutes = Router();

// ── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_EXPIRY_HOURS = 4;
const RESET_TOKEN_EXPIRY_MINUTES = 60;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

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
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** SHA-256 hash a token for safe DB storage */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
  const tokenHash = hashToken(raw);
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

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, emailVerified: null },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Generate verification token — store only the SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: data.email, token: hashToken(rawToken), expires },
    });

    sendVerificationEmail(data.email, data.name, rawToken).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    res.status(201).json({ ...user, message: "Account created! Check your email to verify your account." });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/verify-email?token=xxx */
authRoutes.get("/verify-email", async (req, res, next) => {
  try {
    const rawToken = String(req.query.token || "");
    if (!rawToken) throw new AppError("Missing token", 400);

    const record = await prisma.verificationToken.findUnique({
      where: { token: hashToken(rawToken) },
    });

    if (!record) throw new AppError("Invalid or expired verification link", 400);
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: hashToken(rawToken) } });
      throw new AppError("Verification link has expired. Please request a new one.", 400);
    }

    await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });
    await prisma.verificationToken.delete({ where: { token: hashToken(rawToken) } });

    res.json({ message: "Email verified successfully. You can now sign in." });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/resend-verification */
authRoutes.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Return success regardless to prevent email enumeration
    if (!user || user.emailVerified) {
      res.json({ message: "If that email exists and is unverified, a link has been sent." });
      return;
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token: hashToken(rawToken), expires },
    });

    sendVerificationEmail(email, user.name || "", rawToken).catch(console.error);
    res.json({ message: "If that email exists and is unverified, a link has been sent." });
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

    if (!user.emailVerified) {
      throw new AppError(
        "Please verify your email before signing in. Check your inbox for the verification link.",
        403
      );
    }

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

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: { select: { id: true, email: true, name: true, tokenVersion: true } } },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

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

/** POST /auth/forgot-password */
authRoutes.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Delete any existing unused reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { email, usedAt: null },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { email, tokenHash: hashToken(rawToken), expiresAt },
      });

      sendPasswordResetEmail(email, rawToken).catch(console.error);
    }

    res.json({ message: "If that email exists, a password reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/reset-password */
authRoutes.post("/reset-password", async (req, res, next) => {
  try {
    const { token: rawToken, password } = z.object({
      token: z.string(),
      password: passwordSchema,
    }).parse(req.body);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired password reset link.", 400);
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) throw new AppError("User not found.", 404);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password, mark token used, increment tokenVersion to invalidate all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
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
