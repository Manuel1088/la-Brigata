-- Migration: add gross_amount and net_amount to TipEntry for card tax tracking

ALTER TABLE "public"."TipEntry"
  ADD COLUMN IF NOT EXISTS "gross_amount" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "net_amount"   DECIMAL(65,30);
