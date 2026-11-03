CREATE TABLE "natural_searches" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "natural_searches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "natural_searches_title_key" ON "natural_searches"("title");
CREATE INDEX "natural_searches_id_idx" ON "natural_searches"("id");
