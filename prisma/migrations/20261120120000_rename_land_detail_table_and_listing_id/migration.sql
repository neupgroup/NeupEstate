DO $$
DECLARE
  old_constraint_name TEXT;
  old_index_name TEXT;
BEGIN
  IF to_regclass('public.property_land_detail') IS NOT NULL
    AND to_regclass('public.listings_details__land') IS NULL THEN
    ALTER TABLE public.property_land_detail RENAME TO listings_details__land;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings_details__land'
      AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings_details__land'
      AND column_name = 'listings_id'
  ) THEN
    ALTER TABLE public.listings_details__land RENAME COLUMN "propertyId" TO listings_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('public.listings_details__land')
      AND conname = 'property_land_detail_pkey'
  ) THEN
    ALTER TABLE public.listings_details__land
      RENAME CONSTRAINT property_land_detail_pkey TO listings_details__land_pkey;
  END IF;

  SELECT conname INTO old_constraint_name
  FROM pg_constraint
  WHERE conrelid = to_regclass('public.listings_details__land')
    AND conname IN (
      'property_land_detail_propertyId_fkey',
      'property_land_detail_propertyid_fkey'
    )
  LIMIT 1;

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.listings_details__land RENAME CONSTRAINT %I TO %I',
      old_constraint_name,
      'listings_details__land_listings_id_fkey'
    );
  END IF;

  SELECT index_relation.relname INTO old_index_name
  FROM pg_class AS index_relation
  JOIN pg_namespace AS index_schema ON index_schema.oid = index_relation.relnamespace
  WHERE index_schema.nspname = 'public'
    AND index_relation.relkind = 'i'
    AND index_relation.relname IN (
      'property_land_detail_propertyId_key',
      'property_land_detail_propertyid_key'
    )
  LIMIT 1;

  IF old_index_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      old_index_name,
      'listings_details__land_listings_id_key'
    );
  END IF;
END $$;
