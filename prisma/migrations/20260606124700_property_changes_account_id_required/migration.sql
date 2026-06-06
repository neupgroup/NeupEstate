ALTER TABLE "property_changes"
  ADD COLUMN "account_id" TEXT NOT NULL;

CREATE INDEX "property_changes_account_id_idx" ON "property_changes"("account_id");

ALTER TABLE "property_changes"
  ADD CONSTRAINT "property_changes_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

