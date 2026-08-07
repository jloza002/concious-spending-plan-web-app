-- Backfill the new "income" category section for existing users.
--
-- ensureUserCategoryLibrary() and the registration seed only run for brand-new
-- users; existing users already have a non-empty library (fixed_costs /
-- investments / savings), so they'd never get income defaults through that
-- lazy-backfill path. This is a one-time, idempotent data migration — no
-- schema change, both statements are safe to re-run.

-- 1) Seed DEFAULT_INCOME categories for every user with zero income-section
-- rows (including soft-deleted ones, matching ensureUserCategoryLibrary's own
-- reasoning: an archived row still occupies the (user, section, label) unique
-- slot, so re-seeding over it must not happen).
INSERT INTO "user_categories" ("id", "user_id", "section", "label", "sort_order", "updated_at")
SELECT gen_random_uuid(), u."id", 'income', label, ord, NOW()
FROM "users" u
CROSS JOIN (
  VALUES
    ('Paycheck / Salary', 1),
    ('Side Income', 2),
    ('Gifts / Reimbursements', 3),
    ('Transfers (Zelle / Venmo / Cash App)', 4),
    ('Interest / Dividends', 5)
) AS defaults(label, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "user_categories" uc
  WHERE uc."user_id" = u."id" AND uc."section" = 'income'
)
ON CONFLICT ("user_id", "section", "label") DO NOTHING;

-- 2) Give every UNLOCKED plan a line item per income category the user's
-- library now has, so the category shows up in the transaction dropdown
-- immediately (mirrors how fixed-cost/investment/savings categories already
-- work). Locked plans are deliberately left untouched — same rule every other
-- category-library cascade in this app follows.
INSERT INTO "plan_line_items"
  ("id", "spending_plan_id", "section", "label", "amount", "is_default", "excluded", "sort_order", "created_at")
SELECT gen_random_uuid(), sp."id", uc."section", uc."label", 0, true, false, uc."sort_order", NOW()
FROM "spending_plans" sp
JOIN "user_categories" uc ON uc."user_id" = sp."user_id" AND uc."section" = 'income' AND uc."deleted_at" IS NULL
WHERE sp."is_locked" = false
  AND NOT EXISTS (
    SELECT 1 FROM "plan_line_items" pli
    WHERE pli."spending_plan_id" = sp."id" AND pli."section" = 'income' AND pli."label" = uc."label"
  );
