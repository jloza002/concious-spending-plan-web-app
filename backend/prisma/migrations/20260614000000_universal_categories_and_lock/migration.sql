-- Add per-user shared category library and a lock flag on spending plans.

-- 1) is_locked flag on spending_plans
ALTER TABLE "spending_plans"
  ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false;

-- 2) user_categories table
CREATE TABLE "user_categories" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "section" VARCHAR(50) NOT NULL,
  "label" VARCHAR(255) NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_categories_user_id_section_label_key"
  ON "user_categories" ("user_id", "section", "label");

CREATE INDEX "user_categories_user_id_idx"
  ON "user_categories" ("user_id");

ALTER TABLE "user_categories"
  ADD CONSTRAINT "user_categories_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Backfill: for every existing user, seed their library from the distinct
-- (section, label) pairs they already have across all their plans. Picks the
-- minimum sort_order seen so the library mirrors what they were already using.
INSERT INTO "user_categories" ("id", "user_id", "section", "label", "sort_order", "updated_at")
SELECT
  gen_random_uuid(),
  sp."user_id",
  li."section",
  li."label",
  MIN(li."sort_order"),
  NOW()
FROM "plan_line_items" li
JOIN "spending_plans" sp ON sp."id" = li."spending_plan_id"
GROUP BY sp."user_id", li."section", li."label"
ON CONFLICT ("user_id", "section", "label") DO NOTHING;
