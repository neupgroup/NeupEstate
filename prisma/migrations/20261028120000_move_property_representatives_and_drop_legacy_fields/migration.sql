DO $$ BEGIN
  CREATE TYPE "PropertyRepresentativeRole" AS ENUM (
    'propertyOwner',
    'listingOwner',
    'listingParty',
    'listingOwner.propertyOwner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "property_representatives" (
  "id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "representative_id" TEXT NOT NULL,
  "role" "PropertyRepresentativeRole" NOT NULL,
  "status" TEXT,
  CONSTRAINT "property_representatives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_representatives_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "property_representatives_representative_id_fkey"
    FOREIGN KEY ("representative_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "property_representatives_property_id_idx"
  ON "property_representatives"("property_id");
CREATE INDEX IF NOT EXISTS "property_representatives_representative_id_idx"
  ON "property_representatives"("representative_id");

INSERT INTO "property_representatives" ("id", "property_id", "representative_id", "role", "status")
SELECT
  'c' || substr(md5(random()::text || clock_timestamp()::text || source."property_id" || source."representative_id"), 1, 24),
  source."property_id",
  source."representative_id",
  'listingOwner',
  NULL
FROM (
  SELECT DISTINCT "property_id", "representative_id"
  FROM (
    SELECT p."id" AS "property_id", p."agency" AS "representative_id"
    FROM "property" p
    WHERE p."agency" IS NOT NULL
    UNION ALL
    SELECT p."id" AS "property_id", p."listingOwner" AS "representative_id"
    FROM "property" p
    WHERE p."listingOwner" IS NOT NULL
  ) AS property_accounts
) AS source
INNER JOIN "account" a ON a."id" = source."representative_id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "property_representatives" r
  WHERE r."property_id" = source."property_id"
    AND r."representative_id" = source."representative_id"
    AND r."role" = 'listingOwner'
);

DROP INDEX IF EXISTS "property_agency_idx";
DROP INDEX IF EXISTS "property_listing_owner_idx";
ALTER TABLE "property" DROP COLUMN IF EXISTS "agency";
ALTER TABLE "property" DROP COLUMN IF EXISTS "listingOwner";
