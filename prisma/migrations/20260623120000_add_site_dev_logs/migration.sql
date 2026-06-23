CREATE TABLE "site_dev_log_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_dev_log_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_dev_log_entries" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "source" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "outcome" TEXT,
    "durationMs" INTEGER,
    "summary" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_dev_log_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "site_dev_log_entries_createdAt_idx" ON "site_dev_log_entries"("createdAt");
CREATE INDEX "site_dev_log_entries_source_createdAt_idx" ON "site_dev_log_entries"("source", "createdAt");
CREATE INDEX "site_dev_log_entries_path_createdAt_idx" ON "site_dev_log_entries"("path", "createdAt");
