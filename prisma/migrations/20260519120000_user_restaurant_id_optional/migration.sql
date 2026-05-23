-- Platform admin: users.restaurant_id nullable
ALTER TABLE "public"."users" ALTER COLUMN "restaurant_id" DROP NOT NULL;
