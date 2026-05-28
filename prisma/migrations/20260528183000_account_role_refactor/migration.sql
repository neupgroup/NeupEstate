-- Create authz_role table
CREATE TABLE IF NOT EXISTS "authz_role" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "app_id" TEXT NOT NULL,
  "scope" TEXT,
  "permissions" JSONB,
  "updatedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "authz_role_pkey" PRIMARY KEY ("id")
);

-- Account table refactor
ALTER TABLE "account"
  DROP COLUMN IF EXISTS "mainId",
  DROP COLUMN IF EXISTS "registered",
  DROP COLUMN IF EXISTS "sessionId";

ALTER TABLE "account"
  RENAME COLUMN "createdOn" TO "created_on";

ALTER TABLE "account"
  RENAME COLUMN "accessedOn" TO "accessed_on";

ALTER TABLE "account"
  RENAME COLUMN "neupId" TO "neup_id";

ALTER TABLE "account"
  ADD COLUMN IF NOT EXISTS "connectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "role_id" TEXT;

ALTER TABLE "account"
  ADD CONSTRAINT "account_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "authz_role"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "account_neup_id_key" ON "account"("neup_id");
CREATE INDEX IF NOT EXISTS "account_role_id_idx" ON "account"("role_id");
