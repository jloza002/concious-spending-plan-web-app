-- AlterTable
ALTER TABLE "users" ADD COLUMN     "security_answer_hash" TEXT,
ADD COLUMN     "security_question" VARCHAR(255);
