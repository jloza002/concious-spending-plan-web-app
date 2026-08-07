-- Separate the user's manually-typed net income from the effective value the
-- app calculates against. Without this, recomputeNetIncome() has nowhere to
-- "revert" to once an auto-computed total (from tagged income transactions)
-- has overwritten net_monthly_income — the original manual figure would be
-- gone the moment the first deposit was tagged, so untagging every income
-- transaction couldn't restore it.

ALTER TABLE "spending_plans"
  ADD COLUMN "net_monthly_income_manual" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: every existing plan's current net_monthly_income IS its manual
-- value today (auto-compute didn't exist before this migration), so it's the
-- correct starting baseline for the new column.
UPDATE "spending_plans" SET "net_monthly_income_manual" = "net_monthly_income";
