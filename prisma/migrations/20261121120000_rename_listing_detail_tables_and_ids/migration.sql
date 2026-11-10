-- Rename listing detail tables and use listings_id for their listing key.
DO $$
DECLARE
  rename_pair RECORD;
  old_constraint_name TEXT;
BEGIN
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('listings_commercial', 'listings_details__commercial'),
      ('listings_apartment', 'listings_details__apartment'),
      ('listings_house', 'listings_details__house')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;

  -- Rename key columns where the legacy column name is still present.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__commercial' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__commercial' AND column_name = 'listings_id'
  ) THEN
    ALTER TABLE public.listings_details__commercial RENAME COLUMN "propertyId" TO listings_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__apartment' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__apartment' AND column_name = 'listings_id'
  ) THEN
    ALTER TABLE public.listings_details__apartment RENAME COLUMN "propertyId" TO listings_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__house' AND column_name = 'listingId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__house' AND column_name = 'listings_id'
  ) THEN
    ALTER TABLE public.listings_details__house RENAME COLUMN "listingId" TO listings_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__house' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings_details__house' AND column_name = 'listings_id'
  ) THEN
    ALTER TABLE public.listings_details__house RENAME COLUMN "propertyId" TO listings_id;
  END IF;

  -- Keep primary key and foreign key constraint names aligned with the new schema.
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('listings_details__commercial', 'listings_commercial_pkey', 'listings_details__commercial_pkey', 'listings_commercial_property_id_fkey', 'listings_details__commercial_listings_id_fkey'),
      ('listings_details__apartment', 'listings_apartment_pkey', 'listings_details__apartment_pkey', 'listings_apartment_property_id_fkey', 'listings_details__apartment_listings_id_fkey'),
      ('listings_details__house', 'listings_house_pkey', 'listings_details__house_pkey', 'listings_house_listing_id_fkey', 'listings_details__house_listings_id_fkey')
    ) AS names(table_name, old_pkey, new_pkey, old_fkey, new_fkey)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('public.%I', rename_pair.table_name)) AND conname = rename_pair.old_pkey)
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('public.%I', rename_pair.table_name)) AND conname = rename_pair.new_pkey) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', rename_pair.table_name, rename_pair.old_pkey, rename_pair.new_pkey);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('public.%I', rename_pair.table_name)) AND conname = rename_pair.old_fkey)
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('public.%I', rename_pair.table_name)) AND conname = rename_pair.new_fkey) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', rename_pair.table_name, rename_pair.old_fkey, rename_pair.new_fkey);
    END IF;
  END LOOP;

  -- Rename the unique indexes created for each former listing key.
  FOR rename_pair IN
    SELECT * FROM (VALUES
      ('listings_details__commercial', 'listings_commercial_property_id_key', 'listings_details__commercial_listings_id_key'),
      ('listings_details__apartment', 'listings_apartment_property_id_key', 'listings_details__apartment_listings_id_key'),
      ('listings_details__house', 'listings_house_listing_id_key', 'listings_details__house_listings_id_key')
    ) AS names(table_name, old_index, new_index)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_index)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_index)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', rename_pair.old_index, rename_pair.new_index);
    END IF;
  END LOOP;
END $$;
