-- Migration: add first_name and last_name to users table and populate from name

ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "last_name" TEXT;

-- Populate: first word before first space → first_name, rest → last_name
UPDATE "public"."users"
SET
  "first_name" = SPLIT_PART(TRIM("name"), ' ', 1),
  "last_name"  = CASE
    WHEN POSITION(' ' IN TRIM("name")) > 0
    THEN TRIM(SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name")) + 1))
    ELSE NULL
  END
WHERE "first_name" IS NULL;
