CREATE TABLE "intelligence_mapping" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "c_location" TEXT,
    "c_min_budget" INTEGER,
    "c_max_budget" INTEGER,
    "c_competitor" TEXT,
    "c_type" TEXT,
    "c_purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_mapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intelligence_mapping_account_id_idx" ON "intelligence_mapping"("account_id");
CREATE INDEX "intelligence_mapping_competitor_id_idx" ON "intelligence_mapping"("c_competitor");

ALTER TABLE "intelligence_mapping"
  ADD CONSTRAINT "intelligence_mapping_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intelligence_mapping"
  ADD CONSTRAINT "intelligence_mapping_c_competitor_fkey"
  FOREIGN KEY ("c_competitor") REFERENCES "competitors"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "intelligence_alerts" (
    "id" TEXT NOT NULL,
    "map_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intelligence_alerts_map_id_idx" ON "intelligence_alerts"("map_id");
CREATE INDEX "intelligence_alerts_account_id_idx" ON "intelligence_alerts"("account_id");
CREATE INDEX "intelligence_alerts_listing_id_idx" ON "intelligence_alerts"("listing_id");

ALTER TABLE "intelligence_alerts"
  ADD CONSTRAINT "intelligence_alerts_map_id_fkey"
  FOREIGN KEY ("map_id") REFERENCES "intelligence_mapping"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intelligence_alerts"
  ADD CONSTRAINT "intelligence_alerts_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intelligence_alerts"
  ADD CONSTRAINT "intelligence_alerts_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "competitors"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
