-- Postgres does not auto-index foreign keys. Every query that filters
-- transactions via `import: { spendingPlanId: { in: [...] } }` (listPlans,
-- Excel export, net-income recompute, the dashboard category-summary
-- endpoint) forced a sequential scan of transaction_imports without this.
CREATE INDEX IF NOT EXISTS "transaction_imports_spending_plan_id_idx"
  ON "transaction_imports"("spending_plan_id");

-- Composite index matching the exact filter shape shared by listPlans, the
-- Excel export, net-income recompute, and the dashboard summary endpoint.
CREATE INDEX IF NOT EXISTS "transactions_import_id_spending_category_deleted_at_idx"
  ON "transactions"("import_id", "spending_category", "deleted_at");
