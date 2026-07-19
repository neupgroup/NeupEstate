ALTER TABLE IF EXISTS "SharedLead"
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

UPDATE "SharedLead"
SET "ownerId" = "leadOwner"
WHERE "ownerId" IS NULL
  AND "leadOwner" IS NOT NULL
  AND "leadOwner" IN (SELECT "id" FROM "account");

DO $$
DECLARE
  fallback_owner_id TEXT;
BEGIN
  IF to_regclass('public."SharedLead"') IS NOT NULL THEN
    SELECT "id"
    INTO fallback_owner_id
    FROM "account"
    ORDER BY "created_on" ASC
    LIMIT 1;

    IF fallback_owner_id IS NULL AND EXISTS (SELECT 1 FROM "SharedLead" WHERE "ownerId" IS NULL) THEN
      RAISE EXCEPTION 'Cannot make SharedLead.ownerId required because no account row exists for backfill';
    END IF;

    UPDATE "SharedLead"
    SET "ownerId" = fallback_owner_id
    WHERE "ownerId" IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS "SharedLead"
  ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "SharedLead_ownerId_idx"
  ON "SharedLead"("ownerId");

DO $$
BEGIN
  IF to_regclass('public."SharedLead"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'SharedLead_ownerId_fkey'
        AND conrelid = to_regclass('public."SharedLead"')
    )
  THEN
    EXECUTE 'ALTER TABLE "SharedLead" ADD CONSTRAINT "SharedLead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  END IF;
END $$;
