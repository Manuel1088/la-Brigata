-- Numero certificato medico (opzionale, solo richieste malattia).
ALTER TABLE "leave_requests" ADD COLUMN "certificate_number" TEXT;
