-- Convert intelligence_alerts IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _intelligence_alerts_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _intelligence_alerts_id_uuid_map (old_id)
SELECT id::text FROM public.intelligence_alerts;

UPDATE public.intelligence_alerts AS target
SET id = mapping.new_id::text
FROM _intelligence_alerts_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.intelligence_alerts
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
