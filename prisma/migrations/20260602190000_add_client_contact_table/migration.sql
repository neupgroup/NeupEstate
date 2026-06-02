CREATE TABLE "client_contact" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "client_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_contact_client_id_idx" ON "client_contact"("client_id");
CREATE INDEX "client_contact_type_idx" ON "client_contact"("type");

ALTER TABLE "client_contact"
    ADD CONSTRAINT "client_contact_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "client"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
