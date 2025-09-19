-- Safe migration: add updatedAt to restaurants without dropping other tables
-- Assumes table name is "restaurants" and columns use camelCase as per schema mappings

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "restaurants" 
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END$$;


