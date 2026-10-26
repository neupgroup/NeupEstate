-- Restore the ownership column required by the BaseLead Prisma model.
ALTER TABLE "base_lead"
  ADD COLUMN IF NOT EXISTS "belongsTo" TEXT;

DO $$
DECLARE
  fallback_account_id TEXT;
BEGIN
  SELECT "id"
  INTO fallback_account_id
  FROM "account"
  ORDER BY "created_on" ASC
  LIMIT 1;

  IF fallback_account_id IS NULL
     AND EXISTS (SELECT 1 FROM "base_lead" WHERE "belongsTo" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make BaseLead.belongsTo required because no account row exists for backfill';
  END IF;

  UPDATE "base_lead"
  SET "belongsTo" = fallback_account_id
  WHERE "belongsTo" IS NULL;
END $$;

ALTER TABLE "base_lead"
  ALTER COLUMN "belongsTo" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "base_lead_belongsTo_idx"
  ON "base_lead"("belongsTo");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'base_lead_belongsTo_fkey'
      AND conrelid = to_regclass('public.base_lead')
  ) THEN
    ALTER TABLE "base_lead"
      ADD CONSTRAINT "base_lead_belongsTo_fkey"
      FOREIGN KEY ("belongsTo") REFERENCES "account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
