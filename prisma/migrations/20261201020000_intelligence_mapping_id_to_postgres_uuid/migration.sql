-- Convert intelligence_mapping IDs and intelligence_alerts references.
BEGIN;

CREATE TEMP TABLE _intelligence_mapping_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _intelligence_mapping_id_uuid_map (old_id)
SELECT id::text FROM public.intelligence_mapping;

ALTER TABLE public.intelligence_alerts
  DROP CONSTRAINT "intelligence_alerts_map_id_fkey";

UPDATE public.intelligence_alerts AS target
SET map_id = mapping.new_id::text
FROM _intelligence_mapping_id_uuid_map AS mapping
WHERE target.map_id = mapping.old_id;

UPDATE public.intelligence_mapping AS target
SET id = mapping.new_id::text
FROM _intelligence_mapping_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.intelligence_mapping
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.intelligence_alerts
  ALTER COLUMN map_id TYPE UUID USING map_id::uuid;

ALTER TABLE public.intelligence_alerts
  ADD CONSTRAINT "intelligence_alerts_map_id_fkey"
  FOREIGN KEY (map_id) REFERENCES public.intelligence_mapping(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
