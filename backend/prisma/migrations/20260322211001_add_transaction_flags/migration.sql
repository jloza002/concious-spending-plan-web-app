-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_manual" BOOLEAN NOT NULL DEFAULT false;
