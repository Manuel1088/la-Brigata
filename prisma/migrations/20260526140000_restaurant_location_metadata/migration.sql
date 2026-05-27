-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RISTORANTE', 'BAR', 'SKYBAR', 'COLAZIONI', 'EVENTI', 'ALTRO');

-- AlterTable
ALTER TABLE "RestaurantLocation" ADD COLUMN     "outletName" TEXT;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "type" "LocationType" NOT NULL DEFAULT 'RISTORANTE';
ALTER TABLE "RestaurantLocation" ADD COLUMN     "capacity" INTEGER;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "tables" INTEGER;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "icon" TEXT;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RestaurantLocation" ADD COLUMN     "openingHours" JSONB;

-- Backfill existing rows (Mirabelle, Adele, etc.) — preserve ids
UPDATE "RestaurantLocation"
SET
  "outletName" = "name",
  "type" = 'RISTORANTE',
  "isActive" = true,
  "sortOrder" = CASE
    WHEN LOWER("name") = 'adele' THEN 1
    WHEN LOWER("name") = 'mirabelle' THEN 0
    ELSE 0
  END,
  "icon" = '🍽️',
  "openingHours" = COALESCE(
    "openingHours",
    '{
      "monday": {"open": "12:00", "close": "23:00", "isClosed": false},
      "tuesday": {"open": "12:00", "close": "23:00", "isClosed": false},
      "wednesday": {"open": "12:00", "close": "23:00", "isClosed": false},
      "thursday": {"open": "12:00", "close": "23:00", "isClosed": false},
      "friday": {"open": "12:00", "close": "00:00", "isClosed": false},
      "saturday": {"open": "12:00", "close": "00:00", "isClosed": false},
      "sunday": {"open": "12:00", "close": "22:00", "isClosed": false}
    }'::jsonb
  );

ALTER TABLE "RestaurantLocation" ALTER COLUMN "outletName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RestaurantLocation_restaurantId_sortOrder_idx" ON "RestaurantLocation"("restaurantId", "sortOrder");
