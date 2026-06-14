-- Add nullable account_type to transactions: credit_card | checking | savings
ALTER TABLE "transactions"
  ADD COLUMN "account_type" VARCHAR(20);
