ALTER TABLE "property_changes"
  ADD COLUMN IF NOT EXISTS "property_id" TEXT,
  ADD COLUMN IF NOT EXISTS "is_approved" BOOLEAN;

UPDATE "property_changes"
SET "property_id" = COALESCE("property_id", "propertyId");

UPDATE "property_changes"
SET "is_approved" = CASE
  WHEN "status" = 'expired_approved' THEN true
  WHEN "status" = 'expired_rejected' THEN false
  ELSE "is_approved"
END
WHERE "is_approved" IS NULL;

UPDATE "property_changes"
SET "status" = CASE
  WHEN "status" = 'pending_creation' THEN 'creating'
  WHEN "status" IN ('pending_edits', 'pending') THEN 'editing'
  WHEN "status" = 'expired_approved' AND COALESCE("property_id", "propertyId") IS NULL THEN 'creating'
  WHEN "status" IN ('expired_approved', 'expired_rejected', 'expired_discarded') THEN 'editing'
  ELSE "status"
END;

ALTER TABLE "property_changes"
  ALTER COLUMN "status" SET DEFAULT 'editing';

DROP INDEX IF EXISTS "property_change_propertyId_idx";
DROP INDEX IF EXISTS "property_changes_propertyId_idx";
CREATE INDEX IF NOT EXISTS "property_changes_property_id_idx"
  ON "property_changes"("property_id");

DROP INDEX IF EXISTS "property_changes_status_idx";
CREATE INDEX IF NOT EXISTS "property_changes_status_idx"
  ON "property_changes"("status");

ALTER TABLE "property_changes"
  DROP CONSTRAINT IF EXISTS "property_change_propertyId_fkey";

ALTER TABLE "property_changes"
  DROP CONSTRAINT IF EXISTS "property_changes_propertyId_fkey";

ALTER TABLE "property_changes"
  DROP CONSTRAINT IF EXISTS "property_changes_property_id_fkey";

ALTER TABLE "property_changes"
  ADD CONSTRAINT "property_changes_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_changes"
  DROP COLUMN IF EXISTS "propertyId";
