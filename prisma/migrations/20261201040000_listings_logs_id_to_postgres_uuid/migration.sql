-- Convert listings_logs IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _listings_logs_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _listings_logs_id_uuid_map (old_id)
SELECT id::text FROM public.listings_logs;

UPDATE public.listings_logs AS target
SET id = mapping.new_id::text
FROM _listings_logs_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.listings_logs
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
