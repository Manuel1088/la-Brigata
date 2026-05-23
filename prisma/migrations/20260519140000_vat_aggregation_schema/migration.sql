-- Aggregazione P.IVA (solo schema, senza dati seed)

CREATE TYPE "VatAggregationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ANOMALIA');

CREATE TYPE "VatAggregationResponseStatus" AS ENUM ('IN_ATTESA', 'CONFERMATO', 'RIFIUTATO');

CREATE TABLE "vat_registrations" (
    "id" TEXT NOT NULL,
    "vat_number" TEXT NOT NULL,
    "legal_name" TEXT,
    "aggregation_status" "VatAggregationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "anomaly_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vat_registration_users" (
    "id" TEXT NOT NULL,
    "vat_registration_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_registration_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vat_aggregation_notifications" (
    "id" TEXT NOT NULL,
    "vat_registration_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "response_status" "VatAggregationResponseStatus" NOT NULL DEFAULT 'IN_ATTESA',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_aggregation_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vat_registrations_vat_number_key" ON "vat_registrations"("vat_number");
CREATE INDEX "vat_registrations_aggregation_status_idx" ON "vat_registrations"("aggregation_status");
CREATE UNIQUE INDEX "vat_registration_users_vat_registration_id_user_id_key" ON "vat_registration_users"("vat_registration_id", "user_id");
CREATE INDEX "vat_registration_users_user_id_idx" ON "vat_registration_users"("user_id");
CREATE INDEX "vat_aggregation_notifications_vat_registration_id_idx" ON "vat_aggregation_notifications"("vat_registration_id");
CREATE INDEX "vat_aggregation_notifications_recipient_user_id_response_status_idx" ON "vat_aggregation_notifications"("recipient_user_id", "response_status");
CREATE INDEX "vat_aggregation_notifications_expires_at_idx" ON "vat_aggregation_notifications"("expires_at");

ALTER TABLE "vat_registration_users" ADD CONSTRAINT "vat_registration_users_vat_registration_id_fkey" FOREIGN KEY ("vat_registration_id") REFERENCES "vat_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vat_registration_users" ADD CONSTRAINT "vat_registration_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vat_aggregation_notifications" ADD CONSTRAINT "vat_aggregation_notifications_vat_registration_id_fkey" FOREIGN KEY ("vat_registration_id") REFERENCES "vat_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vat_aggregation_notifications" ADD CONSTRAINT "vat_aggregation_notifications_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vat_aggregation_notifications" ADD CONSTRAINT "vat_aggregation_notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
