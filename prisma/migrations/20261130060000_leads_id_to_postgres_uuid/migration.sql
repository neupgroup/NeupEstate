-- Convert leads IDs and the foreign keys that reference them to PostgreSQL UUIDs.
BEGIN;

CREATE TEMP TABLE _lead_id_uuid_map (
  old_id TEXT PRIMARY KEY,
  new_id UUID NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;

INSERT INTO _lead_id_uuid_map (old_id)
SELECT id::text FROM public.leads;

ALTER TABLE public.leads_contacts DROP CONSTRAINT client_contact_client_id_fkey;
ALTER TABLE public.leads_assignments DROP CONSTRAINT "client_link_clientId_fkey";
ALTER TABLE public.leads_assigned DROP CONSTRAINT "shared_leads_baseLeadId_fkey";
ALTER TABLE public.property_owner DROP CONSTRAINT property_owner_owner_client_id_fkey;

UPDATE public.leads_contacts AS child SET client_id = mapping.new_id::text
FROM _lead_id_uuid_map AS mapping WHERE child.client_id = mapping.old_id;
UPDATE public.leads_assignments AS child SET "clientId" = mapping.new_id::text
FROM _lead_id_uuid_map AS mapping WHERE child."clientId" = mapping.old_id;
UPDATE public.leads_assigned AS child SET "baseLeadId" = mapping.new_id::text
FROM _lead_id_uuid_map AS mapping WHERE child."baseLeadId" = mapping.old_id;
UPDATE public.property_owner AS child SET owner_client_id = mapping.new_id::text
FROM _lead_id_uuid_map AS mapping WHERE child.owner_client_id = mapping.old_id;
UPDATE public.leads AS target SET id = mapping.new_id::text
FROM _lead_id_uuid_map AS mapping WHERE target.id::text = mapping.old_id;

ALTER TABLE public.leads ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.leads_contacts ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
ALTER TABLE public.leads_assignments ALTER COLUMN "clientId" TYPE UUID USING "clientId"::uuid;
ALTER TABLE public.leads_assigned ALTER COLUMN "baseLeadId" TYPE UUID USING "baseLeadId"::uuid;
ALTER TABLE public.property_owner ALTER COLUMN owner_client_id TYPE UUID USING owner_client_id::uuid;

ALTER TABLE public.leads_contacts ADD CONSTRAINT client_contact_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.leads_assignments ADD CONSTRAINT "client_link_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.leads_assigned ADD CONSTRAINT "shared_leads_baseLeadId_fkey"
  FOREIGN KEY ("baseLeadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.property_owner ADD CONSTRAINT property_owner_owner_client_id_fkey
  FOREIGN KEY (owner_client_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
