-- Drop legacy direct account role/profile columns.
ALTER TABLE "account"
  DROP COLUMN IF EXISTS "role_id",
  DROP COLUMN IF EXISTS "agency",
  DROP COLUMN IF EXISTS "agent";

-- Rename activity ownership column from trackerId to accountId.
ALTER TABLE "activity"
  RENAME COLUMN "trackerId" TO "accountId";

ALTER INDEX IF EXISTS "activity_trackerId_idx"
  RENAME TO "activity_accountId_idx";
