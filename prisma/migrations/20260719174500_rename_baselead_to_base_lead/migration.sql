-- Rename the BaseLead backing table from baseLead to base_lead.
DO $$
BEGIN
  IF to_regclass('public.base_lead') IS NULL AND to_regclass('public."baseLead"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "baseLead" RENAME TO "base_lead"';
  END IF;
END $$;

ALTER INDEX IF EXISTS "baseLead_pkey" RENAME TO "base_lead_pkey";
ALTER INDEX IF EXISTS "baseLead_lastName_idx" RENAME TO "base_lead_lastName_idx";
ALTER INDEX IF EXISTS "baseLead_belongsTo_idx" RENAME TO "base_lead_belongsTo_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'baseLead_pkey'
      AND conrelid = to_regclass('public.base_lead')
  )
  THEN
    EXECUTE 'ALTER TABLE "base_lead" RENAME CONSTRAINT "baseLead_pkey" TO "base_lead_pkey"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'baseLead_belongsTo_fkey'
      AND conrelid = to_regclass('public.base_lead')
  )
  THEN
    EXECUTE 'ALTER TABLE "base_lead" RENAME CONSTRAINT "baseLead_belongsTo_fkey" TO "base_lead_belongsTo_fkey"';
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
    EXECUTE 'ALTER TABLE "client_contact" ADD CONSTRAINT "client_contact_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "base_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
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
    EXECUTE 'ALTER TABLE "client_link" ADD CONSTRAINT "client_link_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "base_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
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
    EXECUTE 'ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_owner_client_id_fkey" FOREIGN KEY ("owner_client_id") REFERENCES "base_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
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
    EXECUTE 'ALTER TABLE "shared_leads" ADD CONSTRAINT "shared_leads_baseLeadId_fkey" FOREIGN KEY ("baseLeadId") REFERENCES "base_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;
