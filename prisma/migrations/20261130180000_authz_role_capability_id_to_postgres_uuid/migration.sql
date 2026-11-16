-- Convert authz_role_capability IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _role_capability_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _role_capability_id_uuid_map (old_id)
SELECT id::text FROM public.authz_role_capability;

UPDATE public.authz_role_capability AS target
SET id = mapping.new_id::text
FROM _role_capability_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.authz_role_capability
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
