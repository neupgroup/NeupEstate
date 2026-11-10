DO $$
BEGIN
  IF to_regclass('public.saved_property') IS NOT NULL
     AND to_regclass('public.listings_saved') IS NULL THEN
    ALTER TABLE "saved_property" RENAME TO "listings_saved";
  END IF;
END $$;
