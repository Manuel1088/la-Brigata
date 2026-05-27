-- CreateEnum
CREATE TYPE "ShiftTemplateType" AS ENUM ('PRANZO', 'CENA', 'SPEZZATO', 'BREAKFAST', 'NOTTURNO', 'ALTRO');

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "type" "ShiftTemplateType" NOT NULL DEFAULT 'ALTRO',
    "color" TEXT NOT NULL DEFAULT '#F97316',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_templates_restaurant_id_is_active_idx" ON "shift_templates"("restaurant_id", "is_active");

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
