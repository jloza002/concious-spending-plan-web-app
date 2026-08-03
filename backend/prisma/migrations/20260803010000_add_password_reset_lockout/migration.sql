-- Per-account lockout for the security-question password-reset flow.
-- The existing rate limiter is per-IP only, so it does not stop an attacker
-- who rotates IPs from brute-forcing one account's security answer.

ALTER TABLE "users"
  ADD COLUMN "reset_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reset_locked_until" TIMESTAMP(3);
