-- Rename the BaseLead backing table from the legacy client name to baseLead.
DO $$
BEGIN
  IF to_regclass('public."baseLead"') IS NULL AND to_regclass('public.client') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "client" RENAME TO "baseLead"';
  END IF;
END $$;

ALTER INDEX IF EXISTS "client_pkey" RENAME TO "baseLead_pkey";
ALTER INDEX IF EXISTS "client_lastName_idx" RENAME TO "baseLead_lastName_idx";
ALTER INDEX IF EXISTS "client_belongsTo_idx" RENAME TO "baseLead_belongsTo_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_pkey'
      AND conrelid = to_regclass('public."baseLead"')
  )
  THEN
    EXECUTE 'ALTER TABLE "baseLead" RENAME CONSTRAINT "client_pkey" TO "baseLead_pkey"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_belongsTo_fkey'
      AND conrelid = to_regclass('public."baseLead"')
  )
  THEN
    EXECUTE 'ALTER TABLE "baseLead" RENAME CONSTRAINT "client_belongsTo_fkey" TO "baseLead_belongsTo_fkey"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_contact_client_id_fkey'
      AND conrelid = to_regclass('public.client_contact')
  )
  THEN
    EXECUTE 'ALTER TABLE "client_contact" DROP CONSTRAINT "client_contact_client_id_fkey"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_contact_client_id_fkey'
      AND conrelid = to_regclass('public.client_contact')
  )
  THEN
    EXECUTE 'ALTER TABLE "client_contact" ADD CONSTRAINT "client_contact_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "baseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_link_clientId_fkey'
      AND conrelid = to_regclass('public.client_link')
  )
  THEN
    EXECUTE 'ALTER TABLE "client_link" DROP CONSTRAINT "client_link_clientId_fkey"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_link_clientId_fkey'
      AND conrelid = to_regclass('public.client_link')
  )
  THEN
    EXECUTE 'ALTER TABLE "client_link" ADD CONSTRAINT "client_link_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "baseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_owner_owner_client_id_fkey'
      AND conrelid = to_regclass('public.property_owner')
  )
  THEN
    EXECUTE 'ALTER TABLE "property_owner" DROP CONSTRAINT "property_owner_owner_client_id_fkey"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_owner_owner_client_id_fkey'
      AND conrelid = to_regclass('public.property_owner')
  )
  THEN
    EXECUTE 'ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_owner_client_id_fkey" FOREIGN KEY ("owner_client_id") REFERENCES "baseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_baseLeadId_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" DROP CONSTRAINT "shared_leads_baseLeadId_fkey"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shared_leads'
      AND column_name = 'baseLeadId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_leads_baseLeadId_fkey'
      AND conrelid = to_regclass('public.shared_leads')
  )
  THEN
    EXECUTE 'ALTER TABLE "shared_leads" ADD CONSTRAINT "shared_leads_baseLeadId_fkey" FOREIGN KEY ("baseLeadId") REFERENCES "baseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;
