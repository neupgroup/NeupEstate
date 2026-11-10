DO $$
BEGIN
  IF to_regclass('public.listing_representatives') IS NOT NULL
     AND to_regclass('public.listings_representatives') IS NULL THEN
    ALTER TABLE "listing_representatives" RENAME TO "listings_representatives";
  END IF;

  IF to_regclass('public.listing_representatives_listing_id_idx') IS NOT NULL
     AND to_regclass('public.listings_representatives_listing_id_idx') IS NULL THEN
    ALTER INDEX "listing_representatives_listing_id_idx" RENAME TO "listings_representatives_listing_id_idx";
  END IF;

  IF to_regclass('public.listing_representatives_representative_id_idx') IS NOT NULL
     AND to_regclass('public.listings_representatives_representative_id_idx') IS NULL THEN
    ALTER INDEX "listing_representatives_representative_id_idx" RENAME TO "listings_representatives_representative_id_idx";
  END IF;
END $$;
