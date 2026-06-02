ALTER TABLE "property_changes"
  ADD COLUMN IF NOT EXISTS "account_id" TEXT;

CREATE INDEX IF NOT EXISTS "property_changes_account_id_idx"
  ON "property_changes"("account_id");
