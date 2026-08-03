import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

/**
 * Prisma is mocked so these cover the service's own decisions: what makes a
 * reset succeed, that every failure path returns the identical shape (no
 * distinguishable signal for "no such user" vs "wrong question" vs "wrong
 * answer" vs "locked out"), and the per-account lockout counter. A real
 * bcrypt is used (not mocked) because the whole point of several of these
 * tests is that a real hash comparison happens on every branch, including
 * the ones with no real user — that's what makes the timing profile uniform.
 */
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { resetPasswordWithSecurityAnswer, GENERIC_RESET_ERROR } = await import(
  "./auth-recovery.service.js"
);

const QUESTION = "What city were you born in?";
const ANSWER = "Chicago";
const NEW_HASH = "new-hash-placeholder";

async function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "person@example.com",
    securityQuestion: QUESTION,
    securityAnswerHash: await bcrypt.hash(ANSWER.toLowerCase(), 4),
    resetAttempts: 0,
    resetLockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("resetPasswordWithSecurityAnswer", () => {
  it("succeeds and resets attempts when email, question, and answer all match", async () => {
    const user = await makeUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: "  CHICAGO  ", // case/whitespace-insensitive, matches register/reset UI copy
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: true, userId: user.id });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0][0]).toHaveLength(2);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        passwordHash: NEW_HASH,
        tokenVersion: { increment: 1 },
        resetAttempts: 0,
        resetLockedUntil: null,
      },
    });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("fails uniformly for an email that has no account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await resetPasswordWithSecurityAnswer({
      email: "nobody@example.com",
      securityQuestion: QUESTION,
      securityAnswer: ANSWER,
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: false });
    // No user row to update attempts on — nothing to increment.
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("fails with the same shape when the question does not match the account's", async () => {
    const user = await makeUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({ ...user, resetAttempts: 1 });

    const result = await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: "What is your mother's maiden name?", // wrong question, right answer text
      securityAnswer: ANSWER,
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: false });
  });

  it("fails with the same shape when the answer is wrong", async () => {
    const user = await makeUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({ ...user, resetAttempts: 1 });

    const result = await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: "wrong city",
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: false });
  });

  it("increments the per-account attempt counter on a failed guess", async () => {
    const user = await makeUser({ resetAttempts: 2 });
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({ ...user, resetAttempts: 3 });

    await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: "wrong",
      newPasswordHash: NEW_HASH,
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: { resetAttempts: { increment: 1 } },
      })
    );
  });

  it("locks the account once attempts reach the threshold", async () => {
    const user = await makeUser({ resetAttempts: 4 });
    mockPrisma.user.findUnique.mockResolvedValue(user);
    // First update() call increments and crosses the threshold (5).
    mockPrisma.user.update
      .mockResolvedValueOnce({ ...user, resetAttempts: 5 })
      .mockResolvedValueOnce({ ...user, resetAttempts: 5 });

    await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: "wrong",
      newPasswordHash: NEW_HASH,
    });

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    const lockCall = mockPrisma.user.update.mock.calls[1][0];
    expect(lockCall.data.resetLockedUntil).toBeInstanceOf(Date);
    expect(lockCall.data.resetLockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a correct answer while the account is locked, and does not extend the lock", async () => {
    const user = await makeUser({
      resetAttempts: 5,
      resetLockedUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: ANSWER, // correct answer, account is still locked
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: false });
    // Locked accounts don't accrue further attempts or get a fresh lock window.
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("allows a reset again once the lock window has passed", async () => {
    const user = await makeUser({
      resetAttempts: 5,
      resetLockedUntil: new Date(Date.now() - 1000), // expired
    });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await resetPasswordWithSecurityAnswer({
      email: user.email,
      securityQuestion: QUESTION,
      securityAnswer: ANSWER,
      newPasswordHash: NEW_HASH,
    });

    expect(result).toEqual({ ok: true, userId: user.id });
  });

  it("runs a real bcrypt compare even for a nonexistent user (timing parity with a real account)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const spy = vi.spyOn(bcrypt, "compare");

    await resetPasswordWithSecurityAnswer({
      email: "nobody@example.com",
      securityQuestion: QUESTION,
      securityAnswer: ANSWER,
      newPasswordHash: NEW_HASH,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("exposes one generic, non-specific error message for the route to use on any failure", () => {
    expect(GENERIC_RESET_ERROR).not.toMatch(/no account|not found|incorrect|locked/i);
  });
});
