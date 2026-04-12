import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/auth.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

const BCRYPT_ROUNDS = 10;

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((p) => /[A-Z]/.test(p))
  .refine((p) => /[a-z]/.test(p))
  .refine((p) => /[0-9]/.test(p))
  .refine((p) => /[^A-Za-z0-9]/.test(p));

/** GET /users/me — return current user's profile */
userRoutes.get("/me", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        middleInitial: true,
        lastName: true,
        name: true,
        email: true,
        securityQuestion: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError("User not found", 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** PUT /users/me — update name and/or email */
userRoutes.put("/me", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const data = z.object({
      firstName: z.string().min(1).max(100),
      middleInitial: z.string().max(5).optional(),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
    }).parse(req.body);

    // If email changed, ensure it isn't taken by another user
    if (data.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
      });
      if (conflict) throw new AppError("That email is already in use.", 409);
    }

    const mi = data.middleInitial?.trim() || null;
    const fullName = [data.firstName.trim(), mi ? `${mi}.` : null, data.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName.trim(),
        middleInitial: mi,
        lastName: data.lastName.trim(),
        name: fullName,
        email: data.email,
      },
      select: {
        id: true,
        firstName: true,
        middleInitial: true,
        lastName: true,
        name: true,
        email: true,
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** PUT /users/me/password — change password using current password */
userRoutes.put("/me/password", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema,
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) throw new AppError("User not found", 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError("Current password is incorrect.", 401);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });

    // Revoke all refresh tokens — user must re-login on other devices
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
});

/** DELETE /users/me — permanently delete account */
userRoutes.delete("/me", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) throw new AppError("User not found", 404);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError("Incorrect password.", 401);

    // Cascade deletes all related data via Prisma onDelete: Cascade
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  }
});
