-- Baseline: tabelle create fuori catena (shift_swap, customers, employments).
-- shift_swap_requests: stato PRE peer_pending (status TEXT, default PENDING).
-- Su prod già esistenti: IF NOT EXISTS → no-op.

-- ── EmploymentStatus (mai in migrazioni precedenti) ──
DO $$ BEGIN
  CREATE TYPE "EmploymentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'ACTIVE',
    'REJECTED',
    'TERMINATED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── shift_swap_requests (pre-ALTER: status TEXT) ──
CREATE TABLE IF NOT EXISTS "shift_swap_requests" (
  "id"                 TEXT NOT NULL,
  "restaurant_id"      TEXT NOT NULL,
  "requester_user_id"  TEXT NOT NULL,
  "target_user_id"     TEXT NOT NULL,
  "requester_shift_id" TEXT,
  "target_shift_id"    TEXT,
  "requester_date"     TIMESTAMP(3) NOT NULL,
  "target_date"        TIMESTAMP(3) NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'PENDING',
  "notes"              TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_swap_requests_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "shift_swap_requests"
      ADD CONSTRAINT "shift_swap_requests_restaurant_id_fkey"
      FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_swap_requests_requester_user_id_fkey'
  ) THEN
    ALTER TABLE "shift_swap_requests"
      ADD CONSTRAINT "shift_swap_requests_requester_user_id_fkey"
      FOREIGN KEY ("requester_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_swap_requests_target_user_id_fkey'
  ) THEN
    ALTER TABLE "shift_swap_requests"
      ADD CONSTRAINT "shift_swap_requests_target_user_id_fkey"
      FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shift_swap_requests_requester_user_id_idx"
  ON "shift_swap_requests"("requester_user_id");
CREATE INDEX IF NOT EXISTS "shift_swap_requests_target_user_id_idx"
  ON "shift_swap_requests"("target_user_id");
CREATE INDEX IF NOT EXISTS "shift_swap_requests_restaurant_id_status_idx"
  ON "shift_swap_requests"("restaurant_id", "status");

-- ── customers ──
CREATE TABLE IF NOT EXISTS "customers" (
  "id"            TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "phone"         TEXT,
  "email"         TEXT,
  "notes"         TEXT,
  "visit_count"   INTEGER NOT NULL DEFAULT 0,
  "last_visit"    TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "customers"
      ADD CONSTRAINT "customers_restaurant_id_fkey"
      FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "customers_restaurant_id_idx"
  ON "customers"("restaurant_id");
CREATE INDEX IF NOT EXISTS "customers_restaurant_id_phone_idx"
  ON "customers"("restaurant_id", "phone");

-- ── employments ──
CREATE TABLE IF NOT EXISTS "employments" (
  "id"            TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "status"        "EmploymentStatus" NOT NULL DEFAULT 'PENDING',
  "role"          "UserRole" NOT NULL DEFAULT 'DIPENDENTE',
  "department"    TEXT,
  "requested_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at"   TIMESTAMP(3),
  "reviewed_by"   TEXT,
  "start_date"    TIMESTAMP(3),
  "end_date"      TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employments_user_id_fkey'
  ) THEN
    ALTER TABLE "employments"
      ADD CONSTRAINT "employments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employments_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "employments"
      ADD CONSTRAINT "employments_restaurant_id_fkey"
      FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "employments_user_id_restaurant_id_key"
  ON "employments"("user_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "employments_user_id_idx"
  ON "employments"("user_id");
CREATE INDEX IF NOT EXISTS "employments_restaurant_id_idx"
  ON "employments"("restaurant_id");
CREATE INDEX IF NOT EXISTS "employments_status_idx"
  ON "employments"("status");
CREATE INDEX IF NOT EXISTS "employments_user_id_status_idx"
  ON "employments"("user_id", "status");
CREATE INDEX IF NOT EXISTS "employments_restaurant_id_status_idx"
  ON "employments"("restaurant_id", "status");
CREATE INDEX IF NOT EXISTS "employments_created_at_idx"
  ON "employments"("created_at");
