-- Preserve any media rows that were not copied by the temporary migration script.
UPDATE "listings" AS listing
SET "media" = COALESCE(listing."media", '[]'::jsonb) || COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object('type', media."type", 'url', media."url", 'alt', media."alt")
    ORDER BY media."sortOrder", media."id"
  )
  FROM "listings_media" AS media
  WHERE media."propertyId" = listing."id"
    AND media."isDeleted" = false
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(listing."media", '[]'::jsonb)) AS existing(item)
      WHERE existing.item = jsonb_build_object('type', media."type", 'url', media."url", 'alt', media."alt')
    )
), '[]'::jsonb)
WHERE EXISTS (
  SELECT 1 FROM "listings_media" AS media
  WHERE media."propertyId" = listing."id" AND media."isDeleted" = false
);

DROP TABLE "listings_media";
