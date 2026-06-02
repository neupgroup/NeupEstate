DROP TABLE IF EXISTS "property_owner";

CREATE TABLE "property_owner" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "owner_client_id" TEXT NOT NULL,
    "is_primary_owner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "property_owner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_owner_property_id_idx" ON "property_owner"("property_id");
CREATE INDEX "property_owner_owner_client_id_idx" ON "property_owner"("owner_client_id");
CREATE UNIQUE INDEX "property_owner_property_id_owner_client_id_key" ON "property_owner"("property_id", "owner_client_id");

ALTER TABLE "property_owner"
    ADD CONSTRAINT "property_owner_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "property"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "property_owner"
    ADD CONSTRAINT "property_owner_owner_client_id_fkey"
    FOREIGN KEY ("owner_client_id") REFERENCES "client"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
