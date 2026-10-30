CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "child_of" UUID,
    "postal_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "locations_child_of_idx" ON "locations"("child_of");
CREATE INDEX "locations_type_idx" ON "locations"("type");
CREATE INDEX "locations_status_idx" ON "locations"("status");

ALTER TABLE "locations" ADD CONSTRAINT "locations_child_of_fkey"
    FOREIGN KEY ("child_of") REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
