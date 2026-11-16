-- Convert listings_documents IDs from Prisma CUID text values to PostgreSQL UUIDs.
BEGIN;

-- Preserve existing rows while replacing their CUIDs with UUIDs generated
-- by PostgreSQL. No tables currently reference listings_documents.id.
CREATE TEMP TABLE _listings_documents_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _listings_documents_id_uuid_map (old_id)
SELECT id::text
FROM public.listings_documents;

UPDATE public.listings_documents AS target
SET id = mapping.new_id::text
FROM _listings_documents_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.listings_documents
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
