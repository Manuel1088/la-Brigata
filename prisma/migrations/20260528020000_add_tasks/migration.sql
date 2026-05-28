-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('ALTA', 'MEDIA', 'BASSA');
CREATE TYPE "TaskStatus" AS ENUM ('DA_FARE', 'IN_CORSO', 'COMPLETATO');
CREATE TYPE "TaskRecurringType" AS ENUM ('GIORNALIERO', 'SETTIMANALE', 'MENSILE');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "assigned_to_role" TEXT,
    "assigned_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "TaskStatus" NOT NULL DEFAULT 'DA_FARE',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_type" "TaskRecurringType",
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_restaurant_id_status_idx" ON "tasks"("restaurant_id", "status");
CREATE INDEX "tasks_assigned_to_id_status_idx" ON "tasks"("assigned_to_id", "status");
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
