DO $$
BEGIN
  IF to_regclass('public.lead') IS NULL THEN
    IF to_regclass('public.client') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE "client" RENAME TO "lead"';
    ELSE
      EXECUTE '
        CREATE TABLE "lead" (
          "id" TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "contact" JSONB NOT NULL,
          "source" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
        )
      ';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.lead') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'client_pkey'
        AND conrelid = to_regclass('public.lead')
    ) THEN
      EXECUTE 'ALTER TABLE "lead" RENAME CONSTRAINT "client_pkey" TO "lead_pkey"';
    END IF;

    IF to_regclass('public.client_lastName_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "client_lastName_idx"';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lead_lastName_idx" ON "lead"("lastName");

DO $$
BEGIN
  IF to_regclass('public.lead_shared') IS NULL THEN
    IF to_regclass('public.client_lead') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE "client_lead" RENAME TO "lead_shared"';
    ELSE
      EXECUTE '
        CREATE TABLE "lead_shared" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "type" "LeadType" NOT NULL,
          "requirement" JSONB,
          "priority" "LeadPriority" NOT NULL DEFAULT ''MEDIUM'',
          "leadOwner" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "lead_shared_pkey" PRIMARY KEY ("id")
        )
      ';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.lead_shared') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'client_lead_pkey'
        AND conrelid = to_regclass('public.lead_shared')
    ) THEN
      EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "client_lead_pkey" TO "lead_shared_pkey"';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_pkey'
        AND conrelid = to_regclass('public.lead_shared')
    ) THEN
      EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "lead_pkey" TO "lead_shared_pkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'client_lead_clientId_fkey'
        AND conrelid = to_regclass('public.lead_shared')
    ) THEN
      EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "client_lead_clientId_fkey" TO "lead_shared_clientId_fkey"';
    ELSIF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_clientId_fkey'
        AND conrelid = to_regclass('public.lead_shared')
    ) THEN
      EXECUTE 'ALTER TABLE "lead_shared" RENAME CONSTRAINT "lead_clientId_fkey" TO "lead_shared_clientId_fkey"';
    END IF;

    IF to_regclass('public.client_lead_clientId_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "client_lead_clientId_idx"';
    END IF;
    IF to_regclass('public.lead_clientId_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "lead_clientId_idx"';
    END IF;
    IF to_regclass('public.client_lead_type_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "client_lead_type_idx"';
    END IF;
    IF to_regclass('public.lead_type_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "lead_type_idx"';
    END IF;
    IF to_regclass('public.client_lead_priority_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "client_lead_priority_idx"';
    END IF;
    IF to_regclass('public.lead_priority_idx') IS NOT NULL THEN
      EXECUTE 'DROP INDEX "lead_priority_idx"';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.lead_shared') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'lead_shared_clientId_fkey'
         AND conrelid = to_regclass('public.lead_shared')
     ) THEN
    EXECUTE '
      ALTER TABLE "lead_shared"
      ADD CONSTRAINT "lead_shared_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "lead"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lead_shared_clientId_idx" ON "lead_shared"("clientId");
CREATE INDEX IF NOT EXISTS "lead_shared_type_idx" ON "lead_shared"("type");
CREATE INDEX IF NOT EXISTS "lead_shared_priority_idx" ON "lead_shared"("priority");
