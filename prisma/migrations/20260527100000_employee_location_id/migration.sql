-- Migration: Add locationId to Employee
ALTER TABLE "public"."Employee"
  ADD COLUMN IF NOT EXISTS "location_id" TEXT;

ALTER TABLE "public"."Employee"
  ADD CONSTRAINT "Employee_location_id_fkey"
  FOREIGN KEY ("location_id")
  REFERENCES "public"."RestaurantLocation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Employee_location_id_idx"
  ON "public"."Employee"("location_id");
