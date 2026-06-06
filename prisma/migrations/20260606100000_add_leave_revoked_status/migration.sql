-- Revoca richieste ferie già approvate (LeaveStatus.REVOKED + audit revoke).
-- Sicuro: enum ADD VALUE + colonne nullable, nessuna modifica dati esistente.

ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'REVOKED';

ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "revoked_by" TEXT;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);
