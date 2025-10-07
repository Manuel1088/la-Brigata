-- CreateIndex
CREATE INDEX "restaurants_company_id_idx" ON "public"."restaurants"("company_id");

-- CreateIndex
CREATE INDEX "shifts_user_id_date_idx" ON "public"."shifts"("user_id", "date");

-- CreateIndex
CREATE INDEX "shifts_restaurant_id_date_idx" ON "public"."shifts"("restaurant_id", "date");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "public"."users"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_is_active_idx" ON "public"."users"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "users_restaurant_id_idx" ON "public"."users"("restaurant_id");

-- CreateIndex
CREATE INDEX "users_informal_company_id_idx" ON "public"."users"("informal_company_id");
