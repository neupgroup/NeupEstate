-- Repair shared_leads columns that can remain on the old naming shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'clientId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'baseLeadId'
  ) THEN
    EXECUTE 'ALTER TABLE "shared_leads" RENAME COLUMN "clientId" TO "baseLeadId"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'requirement'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'requirements'
  ) THEN
    EXECUTE 'ALTER TABLE "shared_leads" RENAME COLUMN "requirement" TO "requirements"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'leadOwner'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_leads' AND column_name = 'owner'
  ) THEN
    EXECUTE 'ALTER TABLE "shared_leads" RENAME COLUMN "leadOwner" TO "owner"';
  END IF;
END $$;

DO $$
DECLARE
  fallback_account_id TEXT;
BEGIN
  SELECT "id"
  INTO fallback_account_id
  FROM "account"
  ORDER BY "created_on" ASC
  LIMIT 1;

  IF fallback_account_id IS NULL AND EXISTS (SELECT 1 FROM "shared_leads" WHERE "owner" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make SharedLeads.owner required because no account row exists for backfill';
  END IF;

  UPDATE "shared_leads"
  SET "owner" = fallback_account_id
  WHERE "owner" IS NULL;
END $$;

ALTER TABLE IF EXISTS "shared_leads"
  ALTER COLUMN "baseLeadId" SET NOT NULL;

ALTER TABLE IF EXISTS "shared_leads"
  ALTER COLUMN "owner" SET NOT NULL;

ALTER INDEX IF EXISTS "shared_leads_clientId_idx" RENAME TO "shared_leads_baseLeadId_idx";
ALTER INDEX IF EXISTS "shared_leads_leadOwner_idx" RENAME TO "shared_leads_owner_idx";

CREATE INDEX IF NOT EXISTS "shared_leads_baseLeadId_idx"
  ON "shared_leads"("baseLeadId");

CREATE INDEX IF NOT EXISTS "shared_leads_owner_idx"
  ON "shared_leads"("owner");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_clientId_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" DROP CONSTRAINT "shared_leads_clientId_fkey"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_leadOwner_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" DROP CONSTRAINT "shared_leads_leadOwner_fkey"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_baseLeadId_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" ADD CONSTRAINT "shared_leads_baseLeadId_fkey" FOREIGN KEY ("baseLeadId") REFERENCES "baseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_owner_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" ADD CONSTRAINT "shared_leads_owner_fkey" FOREIGN KEY ("owner") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  END IF;
END $$;
