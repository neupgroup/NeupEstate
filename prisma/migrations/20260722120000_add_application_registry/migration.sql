DO $$
BEGIN
  IF to_regclass('public.application') IS NULL THEN
    CREATE TABLE "application" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "icon" TEXT,
      "website" TEXT,
      "appSecret" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endpoints" JSONB,
      "status" TEXT NOT NULL DEFAULT 'development',
      "responseFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "tokenFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "details" JSONB,
      "party" INTEGER NOT NULL DEFAULT 1,
      "permissionType" TEXT NOT NULL,
      "developerAccountId" TEXT NOT NULL,
      "parentApplicationId" TEXT NOT NULL,
      "defaultRoleId" TEXT,

      CONSTRAINT "application_pkey" PRIMARY KEY ("id")
    );
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'app_secret'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'appSecret'
    ) THEN
      ALTER TABLE "application" RENAME COLUMN "app_secret" TO "appSecret";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'created_at'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'createdAt'
    ) THEN
      ALTER TABLE "application" RENAME COLUMN "created_at" TO "createdAt";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'response_fields'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'responseFields'
    ) THEN
      ALTER TABLE "application" RENAME COLUMN "response_fields" TO "responseFields";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'token_fields'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'tokenFields'
    ) THEN
      ALTER TABLE "application" RENAME COLUMN "token_fields" TO "tokenFields";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'def_role_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'defaultRoleId'
    ) THEN
      ALTER TABLE "application" RENAME COLUMN "def_role_id" TO "defaultRoleId";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'is_internal'
    ) THEN
      ALTER TABLE "application" DROP COLUMN "is_internal";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'provider_id'
    ) THEN
      ALTER TABLE "application" DROP COLUMN "provider_id";
    END IF;

    ALTER TABLE "application"
      ADD COLUMN IF NOT EXISTS "appSecret" TEXT,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "endpoints" JSONB,
      ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'development',
      ADD COLUMN IF NOT EXISTS "responseFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "tokenFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "details" JSONB,
      ADD COLUMN IF NOT EXISTS "party" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "permissionType" TEXT NOT NULL DEFAULT 'self',
      ADD COLUMN IF NOT EXISTS "developerAccountId" TEXT,
      ADD COLUMN IF NOT EXISTS "parentApplicationId" TEXT,
      ADD COLUMN IF NOT EXISTS "defaultRoleId" TEXT;

    IF EXISTS (
      SELECT 1 FROM "application"
      WHERE "developerAccountId" IS NULL OR "parentApplicationId" IS NULL
    ) THEN
      RAISE EXCEPTION 'application.developerAccountId and application.parentApplicationId must be backfilled before they can be made NOT NULL';
    END IF;

    ALTER TABLE "application"
      ALTER COLUMN "developerAccountId" SET NOT NULL,
      ALTER COLUMN "parentApplicationId" SET NOT NULL,
      ALTER COLUMN "permissionType" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_permissionType_check'
  ) THEN
    ALTER TABLE "application"
      ADD CONSTRAINT "application_permissionType_check"
      CHECK ("permissionType" IN ('parent', 'self', 'hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_developerAccountId_fkey'
  ) THEN
    ALTER TABLE "application"
      ADD CONSTRAINT "application_developerAccountId_fkey"
      FOREIGN KEY ("developerAccountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_parentApplicationId_fkey'
  ) THEN
    ALTER TABLE "application"
      ADD CONSTRAINT "application_parentApplicationId_fkey"
      FOREIGN KEY ("parentApplicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_defaultRoleId_fkey'
  ) THEN
    ALTER TABLE "application"
      ADD CONSTRAINT "application_defaultRoleId_fkey"
      FOREIGN KEY ("defaultRoleId") REFERENCES "authz_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "application_developerAccountId_idx" ON "application"("developerAccountId");
CREATE INDEX IF NOT EXISTS "application_parentApplicationId_idx" ON "application"("parentApplicationId");
CREATE INDEX IF NOT EXISTS "application_defaultRoleId_idx" ON "application"("defaultRoleId");
CREATE INDEX IF NOT EXISTS "application_status_idx" ON "application"("status");
