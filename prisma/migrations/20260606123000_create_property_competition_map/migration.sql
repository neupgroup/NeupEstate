CREATE TABLE "property_competition_map" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "competitor_property_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_competition_map_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_competition_map_property_id_idx" ON "property_competition_map"("property_id");
CREATE INDEX "property_competition_map_competitor_property_id_idx" ON "property_competition_map"("competitor_property_id");

ALTER TABLE "property_competition_map"
  ADD CONSTRAINT "property_competition_map_status_check"
  CHECK ("status" IN ('VERIFIED', 'UNVERIFIED', 'DECLINED'));

ALTER TABLE "property_competition_map"
  ADD CONSTRAINT "property_competition_map_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "property"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_competition_map"
  ADD CONSTRAINT "property_competition_map_competitor_property_id_fkey"
  FOREIGN KEY ("competitor_property_id") REFERENCES "competitor_listings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
