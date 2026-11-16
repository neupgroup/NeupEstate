-- Convert competitor IDs and all known foreign-key columns to PostgreSQL UUIDs.
BEGIN;

CREATE TEMP TABLE _competitor_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _competitor_id_uuid_map (old_id)
SELECT id::text FROM public.competitors;

ALTER TABLE public.competitor_sources
  DROP CONSTRAINT "competitor_sources_competitorId_fkey";
ALTER TABLE public.competitors_listings
  DROP CONSTRAINT "competitors_listings_competitorId_fkey";
ALTER TABLE public.intelligence_mapping
  DROP CONSTRAINT "intelligence_mapping_c_competitor_fkey";
ALTER TABLE public.intelligence_alerts
  DROP CONSTRAINT "intelligence_alerts_listing_id_fkey";

UPDATE public.competitor_sources AS target
SET "competitorId" = mapping.new_id::text
FROM _competitor_id_uuid_map AS mapping
WHERE target."competitorId" = mapping.old_id;

UPDATE public.competitors_listings AS target
SET "competitorId" = mapping.new_id::text
FROM _competitor_id_uuid_map AS mapping
WHERE target."competitorId" = mapping.old_id;

UPDATE public.intelligence_mapping AS target
SET c_competitor = mapping.new_id::text
FROM _competitor_id_uuid_map AS mapping
WHERE target.c_competitor = mapping.old_id;

UPDATE public.intelligence_alerts AS target
SET listing_id = mapping.new_id::text
FROM _competitor_id_uuid_map AS mapping
WHERE target.listing_id = mapping.old_id;

UPDATE public.competitors AS target
SET id = mapping.new_id::text
FROM _competitor_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.competitors
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.competitor_sources
  ALTER COLUMN "competitorId" TYPE UUID USING "competitorId"::uuid;
ALTER TABLE public.competitors_listings
  ALTER COLUMN "competitorId" TYPE UUID USING "competitorId"::uuid;
ALTER TABLE public.intelligence_mapping
  ALTER COLUMN c_competitor TYPE UUID USING c_competitor::uuid;
ALTER TABLE public.intelligence_alerts
  ALTER COLUMN listing_id TYPE UUID USING listing_id::uuid;

ALTER TABLE public.competitor_sources
  ADD CONSTRAINT "competitor_sources_competitorId_fkey"
  FOREIGN KEY ("competitorId") REFERENCES public.competitors(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.competitors_listings
  ADD CONSTRAINT "competitors_listings_competitorId_fkey"
  FOREIGN KEY ("competitorId") REFERENCES public.competitors(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.intelligence_mapping
  ADD CONSTRAINT "intelligence_mapping_c_competitor_fkey"
  FOREIGN KEY (c_competitor) REFERENCES public.competitors(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public.intelligence_alerts
  ADD CONSTRAINT "intelligence_alerts_listing_id_fkey"
  FOREIGN KEY (listing_id) REFERENCES public.competitors(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
