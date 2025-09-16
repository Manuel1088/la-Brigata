-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('NORMALE', 'EVENTO_SPECIALE', 'FESTA');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PROPRIETARIO', 'DIRETTORE', 'MANAGER', 'RESPONSABILE_SALA', 'HEAD_CHEF', 'CASSIERE', 'DIPENDENTE');

-- CreateEnum
CREATE TYPE "public"."Department" AS ENUM ('CUCINA', 'SALA', 'BAR');

-- CreateEnum
CREATE TYPE "public"."ContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'STAGIONALE');

-- CreateEnum
CREATE TYPE "public"."CCNLLevel" AS ENUM ('LIVELLO_1Q', 'LIVELLO_2Q', 'LIVELLO_3', 'LIVELLO_4', 'LIVELLO_5', 'LIVELLO_6', 'LIVELLO_7', 'LIVELLO_8');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('VACATION', 'SICK_LEAVE', 'ROL', 'PAID_LEAVE', 'UNPAID_LEAVE', 'PARENTAL_LEAVE', 'STUDY_LEAVE', 'UNION_LEAVE');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('EMPLOYEE', 'CANDIDATE', 'OWNER');

-- CreateTable
CREATE TABLE "public"."restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "hierarchy_level" INTEGER NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_type" "public"."UserType" NOT NULL DEFAULT 'EMPLOYEE',
    "company_id" TEXT,
    "informal_company_id" TEXT,
    "team_code" TEXT,
    "is_job_seeking" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "hourly_rate" DECIMAL(65,30),
    "contract_type" TEXT,
    "start_date" TIMESTAMP(3),
    "avatar" TEXT DEFAULT '👤',
    "ccnl_level" "public"."CCNLLevel",
    "position" TEXT,
    "base_salary" DECIMAL(65,30),
    "fiscal_code" TEXT,
    "address" TEXT,
    "emergency_contact" TEXT,
    "notes" TEXT,
    "weekly_hours" INTEGER,
    "night_shifts" BOOLEAN DEFAULT false,
    "weekend_work" BOOLEAN DEFAULT true,
    "max_consecutive_days" INTEGER DEFAULT 6,
    "contract_type_enum" "public"."ContractType",

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shifts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_tips" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cash_tips" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "card_tips" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "foreign_currency_tips" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "entered_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tip_distributions" (
    "id" TEXT NOT NULL,
    "daily_tips_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tip_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payrolls" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "regular_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "night_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holiday_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "base_pay" DECIMAL(65,30) NOT NULL,
    "overtime_pay" DECIMAL(65,30) NOT NULL,
    "night_pay" DECIMAL(65,30) NOT NULL,
    "holiday_pay" DECIMAL(65,30) NOT NULL,
    "gross_pay" DECIMAL(65,30) NOT NULL,
    "inps_tax" DECIMAL(65,30) NOT NULL,
    "irpef_tax" DECIMAL(65,30) NOT NULL,
    "net_pay" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "type" "public"."LeaveType" NOT NULL,
    "reason" TEXT,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "attachment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ccnl_rules" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "max_daily_hours" INTEGER NOT NULL DEFAULT 8,
    "max_weekly_hours" INTEGER NOT NULL DEFAULT 40,
    "min_rest_between_shifts" INTEGER NOT NULL DEFAULT 11,
    "max_consecutive_days" INTEGER NOT NULL DEFAULT 6,
    "mandatory_weekly_rest" INTEGER NOT NULL DEFAULT 36,

    CONSTRAINT "ccnl_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."restaurant_events" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expected_guests" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL,

    CONSTRAINT "restaurant_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_requirements" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "department" "public"."Department" NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "staff_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_approvals" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "approved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vacation_days" INTEGER NOT NULL DEFAULT 26,
    "rol_hours" INTEGER NOT NULL DEFAULT 32,
    "paid_leave_days" INTEGER NOT NULL DEFAULT 3,
    "unpaid_leave_days" INTEGER NOT NULL DEFAULT 30,
    "parental_days" INTEGER NOT NULL DEFAULT 180,
    "study_days" INTEGER NOT NULL DEFAULT 150,
    "union_days" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "public"."LeaveType" NOT NULL,
    "total" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_policies" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" "public"."LeaveType" NOT NULL,
    "max_days" INTEGER NOT NULL,
    "notice_days" INTEGER NOT NULL,
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "requires_attachment" BOOLEAN NOT NULL DEFAULT false,
    "blackout_periods" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "party_size" INTEGER NOT NULL,
    "table_number" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tables" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_number" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "subscription_type" TEXT NOT NULL DEFAULT 'BASIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."informal_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "type" TEXT,
    "description" TEXT,
    "linked_company_id" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informal_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tips_restaurant_id_date_key" ON "public"."daily_tips"("restaurant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employee_id_month_year_key" ON "public"."payrolls"("employee_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_entitlements_user_id_year_key" ON "public"."leave_entitlements"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_user_id_year_type_key" ON "public"."leave_balances"("user_id", "year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_restaurant_id_type_key" ON "public"."leave_policies"("restaurant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurant_id_table_number_key" ON "public"."tables"("restaurant_id", "table_number");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_key" ON "public"."user_permissions"("user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_fiscal_code_key" ON "public"."companies"("fiscal_code");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_informal_company_id_fkey" FOREIGN KEY ("informal_company_id") REFERENCES "public"."informal_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_tips" ADD CONSTRAINT "daily_tips_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tip_distributions" ADD CONSTRAINT "tip_distributions_daily_tips_id_fkey" FOREIGN KEY ("daily_tips_id") REFERENCES "public"."daily_tips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tip_distributions" ADD CONSTRAINT "tip_distributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ccnl_rules" ADD CONSTRAINT "ccnl_rules_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."restaurant_events" ADD CONSTRAINT "restaurant_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_requirements" ADD CONSTRAINT "staff_requirements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."restaurant_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_approvals" ADD CONSTRAINT "leave_approvals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_approvals" ADD CONSTRAINT "leave_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_entitlements" ADD CONSTRAINT "leave_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_policies" ADD CONSTRAINT "leave_policies_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_skills" ADD CONSTRAINT "employee_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."informal_companies" ADD CONSTRAINT "informal_companies_linked_company_id_fkey" FOREIGN KEY ("linked_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
