DO $$
BEGIN
  IF to_regclass('public.base_leads') IS NULL AND to_regclass('public.lead') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "lead" RENAME TO "base_leads"';
  END IF;

  IF to_regclass('public.shared_leads') IS NULL AND to_regclass('public.crm_lead') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "crm_lead" RENAME TO "shared_leads"';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.base_leads') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_pkey'
        AND conrelid = to_regclass('public.base_leads')
    ) THEN
      EXECUTE 'ALTER TABLE "base_leads" RENAME CONSTRAINT "lead_pkey" TO "base_leads_pkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_clientId_fkey'
        AND conrelid = to_regclass('public.base_leads')
    ) THEN
      EXECUTE 'ALTER TABLE "base_leads" RENAME CONSTRAINT "lead_clientId_fkey" TO "base_leads_clientId_fkey"';
    END IF;

    IF to_regclass('public.lead_clientId_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_clientId_idx" RENAME TO "base_leads_clientId_idx"';
    END IF;
    IF to_regclass('public.lead_type_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_type_idx" RENAME TO "base_leads_type_idx"';
    END IF;
    IF to_regclass('public.lead_priority_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_priority_idx" RENAME TO "base_leads_priority_idx"';
    END IF;
    IF to_regclass('public.lead_shared_clientId_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "lead_shared_clientId_idx"';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.shared_leads') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'crm_lead_pkey'
        AND conrelid = to_regclass('public.shared_leads')
    ) THEN
      EXECUTE 'ALTER TABLE "shared_leads" RENAME CONSTRAINT "crm_lead_pkey" TO "shared_leads_pkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'crm_lead_clientId_fkey'
        AND conrelid = to_regclass('public.shared_leads')
    ) THEN
      EXECUTE 'ALTER TABLE "shared_leads" RENAME CONSTRAINT "crm_lead_clientId_fkey" TO "shared_leads_clientId_fkey"';
    END IF;

    IF to_regclass('public.crm_lead_clientId_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "crm_lead_clientId_idx" RENAME TO "shared_leads_clientId_idx"';
    END IF;
    IF to_regclass('public.crm_lead_type_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "crm_lead_type_idx" RENAME TO "shared_leads_type_idx"';
    END IF;
    IF to_regclass('public.crm_lead_priority_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "crm_lead_priority_idx" RENAME TO "shared_leads_priority_idx"';
    END IF;
  END IF;
END $$;

