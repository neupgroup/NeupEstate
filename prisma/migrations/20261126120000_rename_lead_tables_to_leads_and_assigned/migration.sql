DO $$
DECLARE
  rename_pair RECORD;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('lead_base', 'leads'),
      ('lead_shared', 'leads_assigned')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;

  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('lead_base_belongsTo_idx', 'leads_belongsTo_idx'),
      ('lead_base_lastName_idx', 'leads_lastName_idx'),
      ('lead_shared_baseLeadId_idx', 'leads_assigned_baseLeadId_idx'),
      ('lead_shared_type_idx', 'leads_assigned_type_idx'),
      ('lead_shared_priority_idx', 'leads_assigned_priority_idx'),
      ('lead_shared_owner_idx', 'leads_assigned_owner_idx')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;
