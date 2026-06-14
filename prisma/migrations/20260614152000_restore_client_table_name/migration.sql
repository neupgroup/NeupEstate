DO $$
BEGIN
  IF to_regclass('public.client') IS NULL THEN
    IF to_regclass('public.lead') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE "lead" RENAME TO "client"';
    ELSE
      EXECUTE '
        CREATE TABLE "client" (
          "id" TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "contact" JSONB NOT NULL,
          "source" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "client_pkey" PRIMARY KEY ("id")
        )
      ';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'lead_pkey'
        AND conrelid = to_regclass('public.client')
    ) THEN
      EXECUTE 'ALTER TABLE "client" RENAME CONSTRAINT "lead_pkey" TO "client_pkey"';
    END IF;

    IF to_regclass('public.lead_lastName_idx') IS NOT NULL THEN
      EXECUTE 'ALTER INDEX "lead_lastName_idx" RENAME TO "client_lastName_idx"';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "client_lastName_idx" ON "client"("lastName");
