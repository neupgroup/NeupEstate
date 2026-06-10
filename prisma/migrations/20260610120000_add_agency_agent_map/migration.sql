ALTER TABLE "account"
ADD COLUMN IF NOT EXISTS "agency" TEXT,
ADD COLUMN IF NOT EXISTS "agent" TEXT;

DO $$
BEGIN
  ALTER TABLE "account"
    ADD CONSTRAINT "account_agency_fkey"
    FOREIGN KEY ("agency") REFERENCES "account"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "account"
    ADD CONSTRAINT "account_agent_fkey"
    FOREIGN KEY ("agent") REFERENCES "account"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "account_agency_idx" ON "account"("agency");
CREATE INDEX IF NOT EXISTS "account_agent_idx" ON "account"("agent");

CREATE TABLE IF NOT EXISTS "agency_agent_map" (
  "id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "agency_agent_map_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "agency_agent_map"
    ADD CONSTRAINT "agency_agent_map_agency_id_fkey"
    FOREIGN KEY ("agency_id") REFERENCES "account"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "agency_agent_map"
    ADD CONSTRAINT "agency_agent_map_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "account"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "agency_agent_map_agency_id_agent_id_key"
  ON "agency_agent_map"("agency_id", "agent_id");
CREATE INDEX IF NOT EXISTS "agency_agent_map_agency_id_idx"
  ON "agency_agent_map"("agency_id");
CREATE INDEX IF NOT EXISTS "agency_agent_map_agent_id_idx"
  ON "agency_agent_map"("agent_id");
CREATE INDEX IF NOT EXISTS "agency_agent_map_is_primary_idx"
  ON "agency_agent_map"("is_primary");
