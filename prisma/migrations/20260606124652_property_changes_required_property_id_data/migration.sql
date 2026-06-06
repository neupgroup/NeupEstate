-- Normalize existing property rows created through the old flow.
UPDATE "property"
SET "status" = 'AWAITING_CREATION'
WHERE "status" = 'PENDING'
  AND COALESCE("isApproved", false) = false;

-- Move old draft/edit statuses to the new vocabulary.
UPDATE "property_changes"
SET "status" = CASE
  WHEN "status" IN ('editing', 'pending_edits', 'pending') THEN 'changing'
  WHEN "status" = 'pending_creation' THEN 'creating'
  ELSE "status"
END;

-- Creation requests are now represented by the property row itself, so
-- rows without a linked property are no longer valid.
DELETE FROM "property_changes"
WHERE "property_id" IS NULL;

-- Remove the deprecated account linkage.
DROP INDEX IF EXISTS "property_changes_account_id_idx";
ALTER TABLE "property_changes"
  DROP COLUMN IF EXISTS "account_id";

-- The property link is now mandatory and must reference the property table.
ALTER TABLE "property_changes"
  ALTER COLUMN "property_id" SET NOT NULL;

ALTER TABLE "property_changes"
  DROP CONSTRAINT IF EXISTS "property_changes_property_id_fkey";

ALTER TABLE "property_changes"
  ADD CONSTRAINT "property_changes_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

