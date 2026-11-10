-- Preserve listing pricing metadata in details before removing the dedicated column.
UPDATE "listings"
SET "details" = CASE
  WHEN jsonb_typeof("details") = 'object' THEN "details"
  ELSE '{}'::jsonb
END || jsonb_build_object('pricing', "pricing")
WHERE "pricing" IS NOT NULL;

ALTER TABLE "listings"
DROP COLUMN "pricing";
