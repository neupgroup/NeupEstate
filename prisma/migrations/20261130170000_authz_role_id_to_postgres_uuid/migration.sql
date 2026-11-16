-- Convert authz_role IDs and account_access references to PostgreSQL UUIDs.
BEGIN;

CREATE TEMP TABLE _authz_role_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _authz_role_id_uuid_map (old_id)
SELECT id::text FROM public.authz_role;

ALTER TABLE public.account_access
  DROP CONSTRAINT "account_access_role_id_fkey";

UPDATE public.account_access AS target
SET role_id = mapping.new_id::text
FROM _authz_role_id_uuid_map AS mapping
WHERE target.role_id = mapping.old_id;

UPDATE public.authz_role AS target
SET id = mapping.new_id::text
FROM _authz_role_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.authz_role
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.account_access
  ALTER COLUMN role_id TYPE UUID USING role_id::uuid,
  ADD CONSTRAINT "account_access_role_id_fkey"
  FOREIGN KEY (role_id) REFERENCES public.authz_role(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
