-- CreateTable
CREATE TABLE "walkins" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3),
    "covers" INTEGER NOT NULL,
    "area" TEXT,
    "table_number" INTEGER,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "walkins_restaurant_id_date_idx" ON "walkins"("restaurant_id", "date");

-- AddForeignKey
ALTER TABLE "walkins" ADD CONSTRAINT "walkins_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "walkins" ADD CONSTRAINT "walkins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
