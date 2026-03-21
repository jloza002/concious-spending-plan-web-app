-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT,
    "phone" VARCHAR(50),
    "bio" TEXT,
    "avatar_url" TEXT,
    "timezone" VARCHAR(100) DEFAULT 'America/New_York',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "spending_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "assets" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "investments_nw" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "savings_nw" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_monthly_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_monthly_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spending_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_line_items" (
    "id" UUID NOT NULL,
    "spending_plan_id" UUID NOT NULL,
    "section" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_imports" (
    "id" UUID NOT NULL,
    "spending_plan_id" UUID NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "post_date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "original_category" VARCHAR(100),
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "memo" TEXT,
    "spending_category" VARCHAR(50),
    "spending_subcategory" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_mappings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "description_normalized" VARCHAR(500) NOT NULL,
    "spending_category" VARCHAR(50) NOT NULL,
    "spending_subcategory" VARCHAR(255) NOT NULL,
    "times_used" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "spending_plans_user_id_year_month_idx" ON "spending_plans"("user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "spending_plans_user_id_month_year_key" ON "spending_plans"("user_id", "month", "year");

-- CreateIndex
CREATE INDEX "plan_line_items_spending_plan_id_section_idx" ON "plan_line_items"("spending_plan_id", "section");

-- CreateIndex
CREATE INDEX "transactions_import_id_idx" ON "transactions"("import_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_mappings_user_id_description_normalized_key" ON "category_mappings"("user_id", "description_normalized");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_line_items" ADD CONSTRAINT "plan_line_items_spending_plan_id_fkey" FOREIGN KEY ("spending_plan_id") REFERENCES "spending_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_imports" ADD CONSTRAINT "transaction_imports_spending_plan_id_fkey" FOREIGN KEY ("spending_plan_id") REFERENCES "spending_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "transaction_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
