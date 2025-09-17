/*
  Warnings:

  - Added the required column `updatedAt` to the `restaurants` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."EmployeeRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'CHEF', 'SOUS_CHEF', 'COOK', 'WAITER', 'BARTENDER', 'DISHWASHER', 'HOST', 'CLEANER');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('CARD', 'CASH', 'FOREIGN');

-- AlterTable
ALTER TABLE "public"."restaurants" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."RestaurantLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "score" INTEGER NOT NULL,
    "restDays" TEXT[],
    "ccnlLevel" "public"."CCNLLevel",
    "role" "public"."EmployeeRole" NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "canInsertTips" BOOLEAN NOT NULL DEFAULT false,
    "canViewAll" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TipEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "type" "public"."PaymentType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "time" TEXT,
    "notes" TEXT,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "TipEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TipDistributionV2" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeScore" INTEGER NOT NULL,
    "totalTips" DECIMAL(65,30) NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "isPresent" BOOLEAN NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationVersion" TEXT NOT NULL DEFAULT 'v1.0',

    CONSTRAINT "TipDistributionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlySummary" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "daysWorked" INTEGER NOT NULL,
    "averageDaily" DECIMAL(65,30) NOT NULL,
    "cashAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "foreignAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantLocation_restaurantId_name_key" ON "public"."RestaurantLocation"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_name_key" ON "public"."Employee"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "public"."Employee"("email");

-- CreateIndex
CREATE INDEX "TipEntry_date_locationId_idx" ON "public"."TipEntry"("date", "locationId");

-- CreateIndex
CREATE INDEX "TipEntry_createdAt_idx" ON "public"."TipEntry"("createdAt");

-- CreateIndex
CREATE INDEX "TipDistributionV2_date_locationId_idx" ON "public"."TipDistributionV2"("date", "locationId");

-- CreateIndex
CREATE INDEX "TipDistributionV2_employeeId_date_idx" ON "public"."TipDistributionV2"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TipDistributionV2_date_locationId_employeeId_key" ON "public"."TipDistributionV2"("date", "locationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySummary_year_month_locationId_employeeId_key" ON "public"."MonthlySummary"("year", "month", "locationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "public"."UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_employeeId_idx" ON "public"."UserSession"("employeeId");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "public"."UserSession"("token");

-- AddForeignKey
ALTER TABLE "public"."RestaurantLocation" ADD CONSTRAINT "RestaurantLocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipEntry" ADD CONSTRAINT "TipEntry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipEntry" ADD CONSTRAINT "TipEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."RestaurantLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipEntry" ADD CONSTRAINT "TipEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipDistributionV2" ADD CONSTRAINT "TipDistributionV2_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSession" ADD CONSTRAINT "UserSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
