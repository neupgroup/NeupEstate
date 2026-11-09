ALTER TABLE "listings_house" RENAME COLUMN "propertyId" TO "listingId";

ALTER INDEX "listings_house_property_id_key" RENAME TO "listings_house_listing_id_key";
