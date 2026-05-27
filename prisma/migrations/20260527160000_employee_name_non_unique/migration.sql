-- Remove the global unique constraint on Employee.name.
-- Two employees in different restaurants can now share the same name.

DROP INDEX IF EXISTS "Employee_name_key";

-- Add a regular index on name for query performance
CREATE INDEX IF NOT EXISTS "Employee_name_idx" ON "public"."Employee"("name");
