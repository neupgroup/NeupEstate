-- Convert leads_activity IDs from Prisma CUID text values to PostgreSQL UUIDs.
BEGIN;

-- Preserve existing rows while replacing their CUIDs with UUIDs generated
-- by PostgreSQL. No tables currently reference leads_activity.id.
CREATE TEMP TABLE _leadsActivity_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _leadsActivity_id_uuid_map (old_id)
SELECT id::text FROM public.leads_activity;

UPDATE public.leads_activity AS target SET id = mapping.new_id::text
FROM _leadsActivity_id_uuid_map AS mapping WHERE target.id::text = mapping.old_id;

ALTER TABLE public.leads_activity
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
