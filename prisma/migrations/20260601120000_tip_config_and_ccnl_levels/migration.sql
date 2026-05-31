-- AlterEnum: add missing FIPE CCNL levels (6S, 7)
ALTER TYPE "public"."CCNLLevel" ADD VALUE IF NOT EXISTS 'LIVELLO_6S' BEFORE 'LIVELLO_6';
ALTER TYPE "public"."CCNLLevel" ADD VALUE IF NOT EXISTS 'LIVELLO_7' AFTER 'LIVELLO_6';

-- CreateTable
CREATE TABLE "tip_department_config" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 5,
    "use_department_score" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tip_department_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tip_department_config_restaurant_id_department_key" ON "tip_department_config"("restaurant_id", "department");

-- CreateIndex
CREATE INDEX "tip_department_config_restaurant_id_idx" ON "tip_department_config"("restaurant_id");

-- AddForeignKey
ALTER TABLE "tip_department_config" ADD CONSTRAINT "tip_department_config_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
