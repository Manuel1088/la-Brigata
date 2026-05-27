-- Migration: add split_tips_by_meal to restaurant_events

ALTER TABLE "public"."restaurant_events"
  ADD COLUMN IF NOT EXISTS "split_tips_by_meal" BOOLEAN NOT NULL DEFAULT false;
