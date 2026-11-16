-- Convert agency_agent_map IDs from Prisma CUID text values to PostgreSQL UUIDs.
BEGIN;

-- Preserve existing rows while replacing their CUIDs with UUIDs generated
-- by PostgreSQL. No tables currently reference agency_agent_map.id.
CREATE TEMP TABLE _agencyAgentMap_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _agencyAgentMap_id_uuid_map (old_id)
SELECT id::text
FROM public.agency_agent_map;

UPDATE public.agency_agent_map AS target
SET id = mapping.new_id::text
FROM _agencyAgentMap_id_uuid_map AS mapping
WHERE target.id::text = mapping.old_id;

ALTER TABLE public.agency_agent_map
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
