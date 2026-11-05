-- Add structured pricing fields to listings. They remain nullable for existing rows.
CREATE TYPE "ListingPriceBasis" AS ENUM (
  'total',
  'perUnit',
  'perMonth',
  'perYear',
  'perUnitPerMonth',
  'perUnitPerYear'
);

ALTER TABLE "listings"
ADD COLUMN "priceBasis" "ListingPriceBasis",
ADD COLUMN "priceCurrency" VARCHAR(3),
ADD COLUMN "priceAmount" DECIMAL(22,10);
