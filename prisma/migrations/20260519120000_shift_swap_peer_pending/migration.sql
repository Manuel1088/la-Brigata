-- Stati cambio turno: aggiunge PEER_PENDING (consenso collega prima del manager)
CREATE TYPE "ShiftSwapStatus" AS ENUM ('PEER_PENDING', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "shift_swap_requests"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "shift_swap_requests"
  ALTER COLUMN "status" TYPE "ShiftSwapStatus"
  USING (
    CASE UPPER("status"::text)
      WHEN 'PEER_PENDING' THEN 'PEER_PENDING'::"ShiftSwapStatus"
      WHEN 'PENDING' THEN 'PENDING'::"ShiftSwapStatus"
      WHEN 'APPROVED' THEN 'APPROVED'::"ShiftSwapStatus"
      WHEN 'REJECTED' THEN 'REJECTED'::"ShiftSwapStatus"
      ELSE 'PENDING'::"ShiftSwapStatus"
    END
  );

ALTER TABLE "shift_swap_requests"
  ALTER COLUMN "status" SET DEFAULT 'PEER_PENDING'::"ShiftSwapStatus";
