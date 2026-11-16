-- Convert competitors_listings IDs and property_competition_map references.
BEGIN;

CREATE TEMP TABLE _competitor_listing_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _competitor_listing_id_uuid_map (old_id)
SELECT id::text FROM public.competitors_listings;

ALTER TABLE public.property_competition_map
  DROP CONSTRAINT "property_competition_map_competitor_property_id_fkey";

UPDATE public.property_competition_map AS target
SET competitor_property_id = mapping.new_id::text
FROM _competitor_listing_id_uuid_map AS mapping
WHERE target.competitor_property_id = mapping.old_id;

UPDATE public.competitors_listings AS target
SET id = mapping.new_id::text
FROM _competitor_listing_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.competitors_listings
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.property_competition_map
  ALTER COLUMN competitor_property_id TYPE UUID USING competitor_property_id::uuid;

ALTER TABLE public.property_competition_map
  ADD CONSTRAINT "property_competition_map_competitor_property_id_fkey"
  FOREIGN KEY (competitor_property_id) REFERENCES public.competitors_listings(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
