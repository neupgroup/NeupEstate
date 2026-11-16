ALTER TABLE public.authz_account_access_grant
  ADD COLUMN permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
