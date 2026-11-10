DO $$
BEGIN
  IF to_regclass('public.listing_documents') IS NOT NULL
     AND to_regclass('public.listings_documents') IS NULL THEN
    ALTER TABLE "listing_documents" RENAME TO "listings_documents";
  END IF;

  IF to_regclass('public.listings_documents_property_id_idx') IS NOT NULL
     AND to_regclass('public.listing_documents_property_id_idx') IS NULL THEN
    ALTER INDEX "listings_documents_property_id_idx" RENAME TO "listing_documents_property_id_idx";
  END IF;

  IF to_regclass('public.listings_documents_property_id_idx') IS NULL
     AND to_regclass('public.listing_documents_property_id_idx') IS NOT NULL THEN
    ALTER INDEX "listing_documents_property_id_idx" RENAME TO "listings_documents_property_id_idx";
  END IF;
END $$;
