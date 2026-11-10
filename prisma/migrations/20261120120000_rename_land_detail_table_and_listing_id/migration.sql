ALTER TABLE public.property_land_detail RENAME TO listings_details__land;
ALTER TABLE public.listings_details__land RENAME COLUMN "propertyId" TO listings_id;

ALTER TABLE public.listings_details__land
  RENAME CONSTRAINT property_land_detail_pkey TO listings_details__land_pkey;

ALTER TABLE public.listings_details__land
  RENAME CONSTRAINT property_land_detail_propertyId_fkey TO listings_details__land_listings_id_fkey;

ALTER INDEX public.property_land_detail_propertyId_key
  RENAME TO listings_details__land_listings_id_key;
