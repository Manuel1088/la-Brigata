-- CreateTable
CREATE TABLE "payslip_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "gross_amount" DECIMAL(65,30) NOT NULL,
    "ai_analysis" JSONB NOT NULL,
    "anomalies" JSONB NOT NULL,
    "ccnl_comparison" JSONB NOT NULL,
    "fiscal_analysis" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslip_analyses_user_id_year_month_idx" ON "payslip_analyses"("user_id", "year", "month");

-- AddForeignKey
ALTER TABLE "payslip_analyses" ADD CONSTRAINT "payslip_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
