-- Rename the canonical listed price while preserving its existing values.
ALTER TABLE "listings"
RENAME COLUMN "priceAmount" TO "priceListed";

-- Null means the listing has no explicit negotiability setting.
ALTER TABLE "listings"
ADD COLUMN "priceNegotiable" BOOLEAN;
