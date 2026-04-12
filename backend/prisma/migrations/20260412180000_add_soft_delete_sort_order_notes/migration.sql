-- AlterTable: Add soft delete and sort order to transactions
ALTER TABLE "transactions" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "transactions" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add notes to spending plans
ALTER TABLE "spending_plans" ADD COLUMN "notes" TEXT;
