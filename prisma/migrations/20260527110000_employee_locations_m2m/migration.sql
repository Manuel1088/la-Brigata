-- Migration: EmployeeLocation many-to-many join table

CREATE TABLE "public"."employee_locations" (
  "id"          TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_locations_employee_id_location_id_key" UNIQUE ("employee_id", "location_id"),
  CONSTRAINT "employee_locations_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_locations_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "public"."RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "employee_locations_employee_id_idx" ON "public"."employee_locations"("employee_id");
CREATE INDEX "employee_locations_location_id_idx" ON "public"."employee_locations"("location_id");

-- Migrate existing single locationId → EmployeeLocation row
INSERT INTO "public"."employee_locations" ("id", "employee_id", "location_id")
SELECT
  gen_random_uuid()::text,
  "id",
  "location_id"
FROM "public"."Employee"
WHERE "location_id" IS NOT NULL
ON CONFLICT ("employee_id", "location_id") DO NOTHING;
