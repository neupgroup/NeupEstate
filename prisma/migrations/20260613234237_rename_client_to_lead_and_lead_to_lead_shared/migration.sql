DO $$
BEGIN
  IF to_regclass('public.client_lead') IS NOT NULL AND to_regclass('public.lead_shared') IS NULL THEN
    EXECUTE 'ALTER TABLE "client_lead" RENAME TO "lead_shared"';
  ELSIF to_regclass('public.lead') IS NOT NULL AND to_regclass('public.lead_shared') IS NULL THEN
    EXECUTE 'ALTER TABLE "lead" RENAME TO "lead_shared"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_pkey'
      AND conrelid = to_regclass('public.lead_shared')
  ) THEN
    EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "lead_pkey" TO "lead_shared_pkey"';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_lead_pkey'
      AND conrelid = to_regclass('public.lead_shared')
  ) THEN
    EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "client_lead_pkey" TO "lead_shared_pkey"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_clientId_fkey'
      AND conrelid = to_regclass('public.lead_shared')
  ) THEN
    EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "lead_clientId_fkey" TO "lead_shared_clientId_fkey"';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_lead_clientId_fkey'
      AND conrelid = to_regclass('public.lead_shared')
  ) THEN
    EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "client_lead_clientId_fkey" TO "lead_shared_clientId_fkey"';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.lead_clientId_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "lead_clientId_idx" RENAME TO "lead_shared_clientId_idx"';
  ELSIF to_regclass('public.client_lead_clientId_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "client_lead_clientId_idx" RENAME TO "lead_shared_clientId_idx"';
  END IF;

  IF to_regclass('public.lead_type_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "lead_type_idx" RENAME TO "lead_shared_type_idx"';
  ELSIF to_regclass('public.client_lead_type_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "client_lead_type_idx" RENAME TO "lead_shared_type_idx"';
  END IF;

  IF to_regclass('public.lead_priority_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "lead_priority_idx" RENAME TO "lead_shared_priority_idx"';
  ELSIF to_regclass('public.client_lead_priority_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "client_lead_priority_idx" RENAME TO "lead_shared_priority_idx"';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL AND to_regclass('public.lead') IS NULL THEN
    EXECUTE 'ALTER TABLE "client" RENAME TO "lead"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_pkey'
      AND conrelid = to_regclass('public.lead')
  ) THEN
    EXECUTE 'ALTER TABLE "lead" RENAME CONSTRAINT "client_pkey" TO "lead_pkey"';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.client_lastName_idx') IS NOT NULL THEN
    EXECUTE 'ALTER INDEX "client_lastName_idx" RENAME TO "lead_lastName_idx"';
  END IF;
END $$;
