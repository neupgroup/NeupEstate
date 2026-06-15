-- Convert agency-agent links into invitation records.
ALTER TABLE "agency_agent_map"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'invited';
ALTER TABLE "agency_agent_map"
  ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "agency_agent_map"
SET "status" = 'invited'
WHERE "status" IS NULL;
UPDATE "agency_agent_map"
SET "is_admin" = false
WHERE "is_admin" IS NULL;

DROP INDEX IF EXISTS "agency_agent_map_is_primary_idx";
ALTER TABLE "agency_agent_map"
  DROP COLUMN IF EXISTS "is_primary";

CREATE INDEX IF NOT EXISTS "agency_agent_map_status_idx"
  ON "agency_agent_map"("status");
CREATE INDEX IF NOT EXISTS "agency_agent_map_is_admin_idx"
  ON "agency_agent_map"("is_admin");

-- Make lead ownership reference actual account rows.
UPDATE "base_leads"
SET "leadOwner" = NULL
WHERE "leadOwner" IS NOT NULL
  AND "leadOwner" NOT IN (SELECT "id" FROM "account");

UPDATE "shared_leads"
SET "leadOwner" = NULL
WHERE "leadOwner" IS NOT NULL
  AND "leadOwner" NOT IN (SELECT "id" FROM "account");

ALTER TABLE "base_leads"
  ADD CONSTRAINT "base_leads_leadOwner_fkey"
  FOREIGN KEY ("leadOwner") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shared_leads"
  ADD CONSTRAINT "shared_leads_leadOwner_fkey"
  FOREIGN KEY ("leadOwner") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
