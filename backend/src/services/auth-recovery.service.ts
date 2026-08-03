import bcrypt from "bcrypt";
import { prisma } from "../db/client.js";

/**
 * Every failure path — unknown email, locked account, wrong question, wrong
 * answer — returns this exact message. A distinguishable response for any one
 * of them (as the old two-step /forgot-password + /reset-password flow did)
 * lets an attacker confirm an email is registered and learn exactly which
 * security question protects it before ever guessing an answer.
 */
export const GENERIC_RESET_ERROR =
  "We couldn't verify those details. Double-check your email, security question, and answer, then try again.";

const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCKOUT_MS = 15 * 60 * 1000;

/** Same padded-cost dummy hash used at login, so a missing user costs the same as a real bcrypt compare. */
const DUMMY_HASH = "$2b$10$invalidhashpaddingtomatchbcrypttiming123456";

export interface ResetPasswordParams {
  email: string;
  securityQuestion: string;
  securityAnswer: string;
  newPasswordHash: string;
}

export interface ResetPasswordResult {
  ok: boolean;
  userId?: string;
}

/**
 * Validates a security-question password reset and applies it atomically.
 * Every branch — no such user, locked out, wrong question, wrong answer —
 * runs a bcrypt compare and returns the same `{ ok: false }` shape, so the
 * caller (the route) can respond with one generic message regardless of
 * which check actually failed.
 */
export async function resetPasswordWithSecurityAnswer(
  params: ResetPasswordParams
): Promise<ResetPasswordResult> {
  const { email, securityQuestion, securityAnswer, newPasswordHash } = params;

  const user = await prisma.user.findUnique({ where: { email } });

  const locked =
    !!user?.resetLockedUntil && user.resetLockedUntil.getTime() > Date.now();

  // Always run a bcrypt compare, real hash or dummy, so a missing user, a
  // locked account, and a wrong answer all take roughly the same time.
  const hashToCompare =
    user?.securityAnswerHash && !locked ? user.securityAnswerHash : DUMMY_HASH;
  const answerMatches = await bcrypt.compare(securityAnswer.toLowerCase().trim(), hashToCompare);

  const questionMatches = !!user && user.securityQuestion === securityQuestion;

  const success = !!user && !locked && questionMatches && answerMatches;

  if (success) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user!.id },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 },
          resetAttempts: 0,
          resetLockedUntil: null,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user!.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true, userId: user!.id };
  }

  // Only a real, unlocked account accrues attempts — there is no per-account
  // state to protect for an email that isn't registered, and an already-locked
  // account shouldn't have its lockout window pushed further out by more guesses.
  if (user && !locked) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { resetAttempts: { increment: 1 } },
    });
    if (updated.resetAttempts >= MAX_RESET_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetLockedUntil: new Date(Date.now() + RESET_LOCKOUT_MS) },
      });
    }
  }

  return { ok: false };
}
