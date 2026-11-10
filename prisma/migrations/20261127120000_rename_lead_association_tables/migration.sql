DO $$
DECLARE
  rename_pair RECORD;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('lead_links', 'leads_assignments'),
      ('lead_contacts', 'leads_contacts'),
      ('lead_contact', 'leads_contacts'),
      ('lead_activity', 'leads_activity')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;

  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('client_link_trackerId_idx', 'leads_assignments_trackerId_idx'),
      ('lead_links_trackerId_idx', 'leads_assignments_trackerId_idx'),
      ('client_link_clientId_idx', 'leads_assignments_clientId_idx'),
      ('lead_links_clientId_idx', 'leads_assignments_clientId_idx'),
      ('lead_contact_clientId_idx', 'leads_contacts_client_id_idx'),
      ('lead_contacts_clientId_idx', 'leads_contacts_client_id_idx'),
      ('lead_contacts_client_id_idx', 'leads_contacts_client_id_idx'),
      ('client_contact_clientId_idx', 'leads_contacts_client_id_idx'),
      ('client_contact_client_id_idx', 'leads_contacts_client_id_idx'),
      ('lead_contacts_type_idx', 'leads_contacts_type_idx'),
      ('client_contact_type_idx', 'leads_contacts_type_idx'),
      ('lead_activity_leadId_idx', 'leads_activity_leadId_idx'),
      ('lead_activity_activityOn_idx', 'leads_activity_activityOn_idx'),
      ('lead_activity_activityBy_idx', 'leads_activity_activityBy_idx')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;
