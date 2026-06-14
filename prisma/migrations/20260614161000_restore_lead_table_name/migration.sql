DO $$
BEGIN
  IF to_regclass('public.lead') IS NULL THEN
    IF to_regclass('public.lead_shared') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE "lead_shared" RENAME TO "lead"';
    ELSE
      EXECUTE '
        CREATE TABLE "lead" (
          "id" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "type" "LeadType" NOT NULL,
          "requirement" JSONB,
          "priority" "LeadPriority" NOT NULL DEFAULT ''MEDIUM'',
          "leadOwner" TEXT,
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
      WHERE conname = 'lead_shared_pkey'
        AND conrelid = to_regclass('public.lead')
    ) THEN
      EXECUTE 'ALTER TABLE "lead" RENAME CONSTRAINT "lead_shared_pkey" TO "lead_pkey"';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_shared_clientId_fkey'
        AND conrelid = to_regclass('public.lead')
    ) THEN
      EXECUTE 'ALTER TABLE "lead" RENAME CONSTRAINT "lead_shared_clientId_fkey" TO "lead_clientId_fkey"';
    END IF;

    IF to_regclass('public.lead_shared_clientId_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_shared_clientId_idx" RENAME TO "lead_clientId_idx"';
    END IF;
    IF to_regclass('public.lead_shared_type_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_shared_type_idx" RENAME TO "lead_type_idx"';
    END IF;
    IF to_regclass('public.lead_shared_priority_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_shared_priority_idx" RENAME TO "lead_priority_idx"';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.lead') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'lead_clientId_fkey'
         AND conrelid = to_regclass('public.lead')
     ) THEN
    EXECUTE '
      ALTER TABLE "lead"
      ADD CONSTRAINT "lead_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "client"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lead_clientId_idx" ON "lead"("clientId");
CREATE INDEX IF NOT EXISTS "lead_type_idx" ON "lead"("type");
CREATE INDEX IF NOT EXISTS "lead_priority_idx" ON "lead"("priority");
