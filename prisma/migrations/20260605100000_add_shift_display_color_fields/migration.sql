-- Colore turno ibrido: riferimento template (opzionale) + snapshot hex (opzionale).
-- Turni esistenti: entrambi NULL → nessun cambiamento comportamentale fino ai commit UI/API.

ALTER TABLE "shifts" ADD COLUMN "shift_template_id" TEXT;
ALTER TABLE "shifts" ADD COLUMN "display_color" VARCHAR(7);

CREATE INDEX "shifts_shift_template_id_idx" ON "shifts"("shift_template_id");

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shift_template_id_fkey"
  FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
