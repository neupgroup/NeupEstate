CREATE TABLE "competitor_listings" (
    "id" TEXT NOT NULL,
    "competitorPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT NOT NULL,
    "agentName" TEXT,
    "price" JSONB,
    "priceBasis" TEXT,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "loggedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "competitor_listings_competitorPageId_key" ON "competitor_listings"("competitorPageId");
CREATE INDEX "competitor_listings_loggedOn_idx" ON "competitor_listings"("loggedOn");

ALTER TABLE "competitor_listings"
  ADD CONSTRAINT "competitor_listings_competitorPageId_fkey"
  FOREIGN KEY ("competitorPageId") REFERENCES "competitor_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
