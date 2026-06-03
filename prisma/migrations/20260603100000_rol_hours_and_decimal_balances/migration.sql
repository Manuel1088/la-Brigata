-- ROL a ore: ore richieste sulla richiesta; saldi in unità decimali (giorni o ore).

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "requested_hours" DECIMAL(5, 2);

ALTER TABLE "leave_balances"
  ALTER COLUMN "total" TYPE DECIMAL(6, 2) USING "total"::DECIMAL(6, 2),
  ALTER COLUMN "used" TYPE DECIMAL(6, 2) USING "used"::DECIMAL(6, 2),
  ALTER COLUMN "remaining" TYPE DECIMAL(6, 2) USING "remaining"::DECIMAL(6, 2);
