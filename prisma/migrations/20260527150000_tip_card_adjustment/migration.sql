-- Migration: create tip_card_adjustments table

CREATE TABLE "public"."tip_card_adjustments" (
  "id"            TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "month"         INTEGER NOT NULL,
  "year"          INTEGER NOT NULL,
  "gross_amount"  DECIMAL(65,30) NOT NULL,
  "net_amount"    DECIMAL(65,30) NOT NULL,
  "tax_difference" DECIMAL(65,30) NOT NULL,
  "applied_at"    TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tip_card_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tip_card_adjustments_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "tip_card_adjustments_restaurant_id_year_month_idx"
  ON "public"."tip_card_adjustments"("restaurant_id", "year", "month");
