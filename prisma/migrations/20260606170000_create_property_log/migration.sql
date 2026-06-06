CREATE TABLE "property_log" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "data" JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[],
    "requested_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_on" TIMESTAMP(3),

    CONSTRAINT "property_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_log_property_id_idx" ON "property_log"("property_id");
CREATE INDEX "property_log_requested_by_idx" ON "property_log"("requested_by");
CREATE INDEX "property_log_approved_by_idx" ON "property_log"("approved_by");
