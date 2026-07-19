-- Rename the former base_leads table to the Prisma default table for SharedLead.
DO $$
BEGIN
  IF to_regclass('public."SharedLead"') IS NULL AND to_regclass('public.base_leads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "base_leads" RENAME TO "SharedLead"';
  END IF;
END $$;

-- Rename SharedLead columns.
ALTER TABLE IF EXISTS "SharedLead"
  RENAME COLUMN "clientId" TO "baseLead_id";

ALTER TABLE IF EXISTS "SharedLead"
  RENAME COLUMN "requirement" TO "requirements";

-- Rename constraints left over from the previous base_leads table name.
DO $$
BEGIN
  IF to_regclass('public."SharedLead"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'base_leads_pkey'
        AND conrelid = to_regclass('public."SharedLead"')
    ) THEN
      EXECUTE 'ALTER TABLE "SharedLead" RENAME CONSTRAINT "base_leads_pkey" TO "SharedLead_pkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'base_leads_clientId_fkey'
        AND conrelid = to_regclass('public."SharedLead"')
    ) THEN
      EXECUTE 'ALTER TABLE "SharedLead" RENAME CONSTRAINT "base_leads_clientId_fkey" TO "SharedLead_baseLead_id_fkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'base_leads_leadOwner_fkey'
        AND conrelid = to_regclass('public."SharedLead"')
    ) THEN
      EXECUTE 'ALTER TABLE "SharedLead" RENAME CONSTRAINT "base_leads_leadOwner_fkey" TO "SharedLead_leadOwner_fkey"';
    END IF;
  END IF;
END $$;

-- Rename indexes left over from the previous base_leads table name.
ALTER INDEX IF EXISTS "base_leads_clientId_idx" RENAME TO "SharedLead_baseLead_id_idx";
ALTER INDEX IF EXISTS "base_leads_type_idx" RENAME TO "SharedLead_type_idx";
ALTER INDEX IF EXISTS "base_leads_priority_idx" RENAME TO "SharedLead_priority_idx";
ALTER INDEX IF EXISTS "base_leads_leadOwner_idx" RENAME TO "SharedLead_leadOwner_idx";
