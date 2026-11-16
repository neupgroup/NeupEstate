-- Convert property_competition_map IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _property_competition_map_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _property_competition_map_id_uuid_map (old_id)
SELECT id::text FROM public.property_competition_map;

UPDATE public.property_competition_map AS target
SET id = mapping.new_id::text
FROM _property_competition_map_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.property_competition_map
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
