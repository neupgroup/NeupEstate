ALTER TABLE "property" DROP CONSTRAINT IF EXISTS "property_slug_key";
CREATE INDEX IF NOT EXISTS "property_slug_idx" ON "property"("slug");
