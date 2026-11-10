-- Rename lead tables while preserving their data and foreign key relationships.
DO $$
DECLARE
  rename_pair RECORD;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('base_lead', 'lead_base'),
      ('client_contact', 'lead_contacts'),
      ('client_link', 'lead_links'),
      ('shared_leads', 'lead_shared')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;
