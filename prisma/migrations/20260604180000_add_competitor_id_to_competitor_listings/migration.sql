ALTER TABLE "competitor_listings"
  ADD COLUMN "competitorId" TEXT;

UPDATE "competitor_listings" cl
SET "competitorId" = cp."competitorId"
FROM "competitor_pages" cp
WHERE cp."id" = cl."competitorPageId";

ALTER TABLE "competitor_listings"
  ALTER COLUMN "competitorId" SET NOT NULL;

CREATE INDEX "competitor_listings_competitorId_idx" ON "competitor_listings"("competitorId");

ALTER TABLE "competitor_listings"
  ADD CONSTRAINT "competitor_listings_competitorId_fkey"
  FOREIGN KEY ("competitorId") REFERENCES "competitors"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
