-- Convert authz_account_access_grant IDs to PostgreSQL-generated UUIDs.
BEGIN;

CREATE TEMP TABLE _authz_account_access_grant_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _authz_account_access_grant_id_uuid_map (old_id)
SELECT id::text FROM public.authz_account_access_grant;

UPDATE public.authz_account_access_grant AS target
SET id = mapping.new_id::text
FROM _authz_account_access_grant_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.authz_account_access_grant
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
