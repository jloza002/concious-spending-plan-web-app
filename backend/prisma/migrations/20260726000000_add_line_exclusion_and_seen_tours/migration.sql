-- Per-line exclusion toggle (what-if analysis) on plan line items
ALTER TABLE "plan_line_items" ADD COLUMN "excluded" BOOLEAN NOT NULL DEFAULT false;

-- Account-scoped record of which product tours a user has seen
ALTER TABLE "users" ADD COLUMN "seen_tours" TEXT[] NOT NULL DEFAULT '{}';
