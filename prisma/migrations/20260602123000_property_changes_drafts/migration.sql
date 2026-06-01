ALTER TABLE IF EXISTS "property_change" RENAME TO "property_changes";

ALTER TABLE "property_changes"
  ALTER COLUMN "propertyId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending_edits',
  ADD COLUMN IF NOT EXISTS "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "property_changes_status_idx" ON "property_changes"("status");
CREATE INDEX IF NOT EXISTS "property_changes_createdOn_idx" ON "property_changes"("createdOn");
