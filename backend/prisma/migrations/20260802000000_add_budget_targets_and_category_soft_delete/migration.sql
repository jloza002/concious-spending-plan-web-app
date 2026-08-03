-- Monthly budget targets, plus soft delete on the category library so that
-- removing a category never erases the months it was already budgeted for.

-- 1) Soft delete on user_categories (mirrors transactions.deleted_at)
ALTER TABLE "user_categories"
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- 2) budget_targets table
CREATE TABLE "budget_targets" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "user_category_id" UUID NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "budget_targets_pkey" PRIMARY KEY ("id")
);

-- One target per category per month; the API replaces a month wholesale.
CREATE UNIQUE INDEX "budget_targets_user_id_user_category_id_month_year_key"
  ON "budget_targets" ("user_id", "user_category_id", "month", "year");

-- Primary read path: everything for one user's month.
CREATE INDEX "budget_targets_user_id_month_year_idx"
  ON "budget_targets" ("user_id", "month", "year");

ALTER TABLE "budget_targets"
  ADD CONSTRAINT "budget_targets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT, not CASCADE: categories are soft-deleted, so this should never
-- fire. If anything ever hard-deletes one, budget history is protected.
ALTER TABLE "budget_targets"
  ADD CONSTRAINT "budget_targets_user_category_id_fkey"
  FOREIGN KEY ("user_category_id") REFERENCES "user_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
