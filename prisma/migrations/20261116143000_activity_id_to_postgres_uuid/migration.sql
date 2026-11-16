-- Convert activity IDs from Prisma CUID text values to PostgreSQL UUIDs.
BEGIN;

-- Preserve each existing row while replacing its CUID with a UUID generated
-- by PostgreSQL. No current Prisma model references activity.id.
CREATE TEMP TABLE _activity_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _activity_id_uuid_map (old_id)
SELECT id::text
FROM public.activity;

UPDATE public.activity AS target
SET id = mapping.new_id::text
FROM _activity_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.activity
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
