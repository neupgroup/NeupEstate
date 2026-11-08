ALTER TABLE "account" RENAME TO "accounts";

ALTER TABLE "accounts" RENAME COLUMN "accountType" TO "type";
ALTER TABLE "accounts" RENAME COLUMN "displayImage" TO "display_image";
ALTER TABLE "accounts" RENAME COLUMN "displayName" TO "display_name";
ALTER TABLE "accounts" RENAME COLUMN "neup_id" TO "neupid";
ALTER TABLE "accounts" DROP COLUMN "connectionId";
ALTER TABLE "accounts" ADD COLUMN "more_details" JSONB;

UPDATE "accounts" AS account_row
SET "more_details" = COALESCE(account_row."more_details", '{}'::JSONB) || jsonb_build_object(
  'preferences',
  COALESCE(account_row."more_details" -> 'preferences', '{}'::JSONB)
    || jsonb_build_object('display', user_preference."preferences" -> 'display')
)
FROM "user_preferences" AS user_preference
WHERE user_preference."accountId" = account_row."id"
  AND user_preference."preferences" ? 'display';

UPDATE "user_preferences"
SET "preferences" = "preferences" - 'display'
WHERE "preferences" ? 'display';

ALTER TABLE "accounts" RENAME CONSTRAINT "account_pkey" TO "accounts_pkey";
ALTER TABLE "accounts" RENAME CONSTRAINT "account_working_profile_fkey" TO "accounts_working_profile_fkey";
ALTER INDEX IF EXISTS "account_neupId_key" RENAME TO "accounts_neupid_key";
DROP INDEX IF EXISTS "account_neup_id_key";
ALTER INDEX IF EXISTS "account_working_profile_idx" RENAME TO "accounts_working_profile_idx";
