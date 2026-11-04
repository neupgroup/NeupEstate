-- Rename property storage tables in place; preserve all existing rows and relationships.
DO $$
DECLARE
  rename_pair RECORD;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('property', 'listings'),
      ('property_apartment_detail', 'listings_apartment'),
      ('property_commercial_detail', 'listings_commercial'),
      ('property_house_detail', 'listings_house'),
      ('property_changes', 'listing_changes'),
      ('property_document', 'listing_documents'),
      ('property_log', 'listings_logs'),
      ('property_views', 'listings_views'),
      ('property_media', 'listings_media')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;

ALTER INDEX IF EXISTS public.property_slug_idx RENAME TO listings_slug_idx;

-- Rename indexes and unique constraints so their names match the new tables.
DO $$
DECLARE
  rename_pair RECORD;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('property_slug_idx', 'listings_slug_idx'),
      ('property_apartment_detail_propertyId_key', 'listings_apartment_property_id_key'),
      ('property_commercial_detail_propertyId_key', 'listings_commercial_property_id_key'),
      ('property_house_detail_propertyId_key', 'listings_house_property_id_key'),
      ('property_changes_property_id_idx', 'listing_changes_property_id_idx'),
      ('property_changes_account_id_idx', 'listing_changes_account_id_idx'),
      ('property_changes_created_by_id_idx', 'listing_changes_created_by_id_idx'),
      ('property_changes_created_for_id_idx', 'listing_changes_created_for_id_idx'),
      ('property_changes_working_profile_id_idx', 'listing_changes_working_profile_id_idx'),
      ('property_changes_status_idx', 'listing_changes_status_idx'),
      ('property_changes_createdOn_idx', 'listing_changes_created_on_idx'),
      ('property_changes_modifiedOn_idx', 'listing_changes_modified_on_idx'),
      ('property_document_propertyId_idx', 'listing_documents_property_id_idx'),
      ('property_log_property_id_idx', 'listings_logs_property_id_idx'),
      ('property_log_requested_by_idx', 'listings_logs_requested_by_idx'),
      ('property_log_approved_by_idx', 'listings_logs_approved_by_idx'),
      ('property_media_propertyId_idx', 'listings_media_property_id_idx'),
      ('property_views_propertyId_idx', 'listings_views_property_id_idx')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;

ALTER INDEX IF EXISTS public.property_slug_key RENAME TO listings_slug_key;
ALTER INDEX IF EXISTS public.property_type_idx RENAME TO listings_type_idx;
ALTER INDEX IF EXISTS public.property_purpose_idx RENAME TO listings_purpose_idx;
ALTER INDEX IF EXISTS public.property_status_idx RENAME TO listings_status_idx;
ALTER INDEX IF EXISTS public.property_views_accountId_idx RENAME TO listings_views_account_id_idx;
