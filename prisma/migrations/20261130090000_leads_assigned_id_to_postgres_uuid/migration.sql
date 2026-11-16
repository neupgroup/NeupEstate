-- Convert leads_assigned IDs and their leads_activity reference to PostgreSQL UUIDs.
BEGIN;

CREATE TEMP TABLE _leads_assigned_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _leads_assigned_id_uuid_map (old_id)
SELECT id::text FROM public.leads_assigned;

ALTER TABLE public.leads_activity DROP CONSTRAINT "lead_activity_leadId_fkey";

UPDATE public.leads_activity AS child SET "leadId" = mapping.new_id::text
FROM _leads_assigned_id_uuid_map AS mapping WHERE child."leadId" = mapping.old_id;
UPDATE public.leads_assigned AS target SET id = mapping.new_id::text
FROM _leads_assigned_id_uuid_map AS mapping WHERE target.id::text = mapping.old_id;

ALTER TABLE public.leads_assigned ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.leads_activity ALTER COLUMN "leadId" TYPE UUID USING "leadId"::uuid;

ALTER TABLE public.leads_activity ADD CONSTRAINT "lead_activity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES public.leads_assigned(id) ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
