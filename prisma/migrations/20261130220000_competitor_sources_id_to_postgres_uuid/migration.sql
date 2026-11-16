-- Convert competitor_sources IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _competitor_source_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _competitor_source_id_uuid_map (old_id)
SELECT id::text FROM public.competitor_sources;

UPDATE public.competitor_sources AS target
SET id = mapping.new_id::text
FROM _competitor_source_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.competitor_sources
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
