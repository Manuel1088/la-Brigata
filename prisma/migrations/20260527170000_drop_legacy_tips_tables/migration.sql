-- Drop legacy V1 tips tables.
-- These are superseded by TipEntry + TipDistributionV2 (the active system).
-- tip_distributions references daily_tips, so drop child first.

DROP TABLE IF EXISTS "public"."tip_distributions";
DROP TABLE IF EXISTS "public"."daily_tips";
