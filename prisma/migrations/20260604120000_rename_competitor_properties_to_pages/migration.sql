-- Rename the saved page table and its tracking FK column.
ALTER TABLE "competitor_properties" RENAME TO "competitor_pages";

ALTER TABLE "competitor_tracking" RENAME COLUMN "competitorPropertyId" TO "competitorPageId";

ALTER TABLE "competitor_tracking" DROP CONSTRAINT "competitor_tracking_competitorPropertyId_fkey";
ALTER TABLE "competitor_tracking"
  ADD CONSTRAINT "competitor_tracking_competitorPageId_fkey"
  FOREIGN KEY ("competitorPageId") REFERENCES "competitor_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER INDEX "competitor_properties_pkey" RENAME TO "competitor_pages_pkey";
ALTER INDEX "competitor_properties_competitorId_idx" RENAME TO "competitor_pages_competitorId_idx";
ALTER INDEX "competitor_properties_source_idx" RENAME TO "competitor_pages_source_idx";
ALTER INDEX "competitor_tracking_competitorPropertyId_idx" RENAME TO "competitor_tracking_competitorPageId_idx";

ALTER TABLE "competitor_pages"
  ADD COLUMN IF NOT EXISTS "visibleHtml" TEXT;
