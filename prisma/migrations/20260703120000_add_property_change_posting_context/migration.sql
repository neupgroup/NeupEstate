ALTER TABLE "property_changes"
ADD COLUMN "created_by_id" TEXT,
ADD COLUMN "created_for_id" TEXT,
ADD COLUMN "working_profile_id" TEXT;

CREATE INDEX "property_changes_created_by_id_idx" ON "property_changes"("created_by_id");
CREATE INDEX "property_changes_created_for_id_idx" ON "property_changes"("created_for_id");
CREATE INDEX "property_changes_working_profile_id_idx" ON "property_changes"("working_profile_id");

ALTER TABLE "property_changes"
ADD CONSTRAINT "property_changes_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_changes"
ADD CONSTRAINT "property_changes_created_for_id_fkey"
FOREIGN KEY ("created_for_id") REFERENCES "account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_changes"
ADD CONSTRAINT "property_changes_working_profile_id_fkey"
FOREIGN KEY ("working_profile_id") REFERENCES "account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
