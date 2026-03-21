import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import { sendVerificationEmail } from "../services/email.service.js";

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_EXPIRY_HOURS = 24;

/** POST /auth/register - Create a new user and send verification email */
authRoutes.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user with emailVerified = null (unverified)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        emailVerified: null,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Generate a secure verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: data.email,
        token,
        expires,
      },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(data.email, data.name, token).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    res.status(201).json({
      ...user,
      message: "Account created! Check your email to verify your account.",
    });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/verify-email?token=xxx - Verify email address */
authRoutes.get("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.query.token || "");
    if (!token) throw new AppError("Missing token", 400);

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record) throw new AppError("Invalid or expired verification link", 400);
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      throw new AppError("Verification link has expired. Please request a new one.", 400);
    }

    // Mark user as verified
    await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await prisma.verificationToken.delete({ where: { token } });

    res.json({ message: "Email verified successfully. You can now sign in." });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/resend-verification - Resend verification email */
authRoutes.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found (prevent email enumeration)
      res.json({ message: "If that email exists, a verification link has been sent." });
      return;
    }

    if (user.emailVerified) {
      throw new AppError("This email is already verified.", 400);
    }

    // Delete any existing token for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    sendVerificationEmail(email, user.name || "", token).catch(console.error);

    res.json({ message: "Verification email sent." });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/login - Verify credentials (called by NextAuth Credentials provider) */
authRoutes.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    if (!user.emailVerified) {
      throw new AppError(
        "Please verify your email before signing in. Check your inbox for the verification link.",
        403
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError("Server configuration error: JWT_SECRET not set", 500);

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});
