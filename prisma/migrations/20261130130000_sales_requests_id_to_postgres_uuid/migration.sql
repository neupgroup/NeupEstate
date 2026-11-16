-- Convert sales_requests IDs from Prisma CUID text values to PostgreSQL UUIDs.
BEGIN;

-- Preserve existing rows while replacing their CUIDs with UUIDs generated
-- by PostgreSQL. No tables currently reference sales_requests.id.
CREATE TEMP TABLE _salesRequest_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _salesRequest_id_uuid_map (old_id)
SELECT id::text FROM public.sales_requests;

UPDATE public.sales_requests AS target SET id = mapping.new_id::text
FROM _salesRequest_id_uuid_map AS mapping WHERE target.id::text = mapping.old_id;

ALTER TABLE public.sales_requests
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
