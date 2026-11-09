ALTER TABLE "listings"
RENAME COLUMN "structuredLocation" TO "location";

ALTER TABLE "listings"
ALTER COLUMN "location" TYPE UUID USING "location"::uuid;

CREATE INDEX "listings_location_idx" ON "listings"("location");

ALTER TABLE "listings"
ADD CONSTRAINT "listings_location_fkey"
FOREIGN KEY ("location") REFERENCES "locations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
