-- Preserve any media rows that were not copied by the temporary migration script.
WITH media_by_listing AS (
  SELECT media."propertyId",
         jsonb_agg(
           jsonb_build_object('type', media."type", 'url', media."url", 'alt', media."alt")
           ORDER BY media."sortOrder", media."id"
         ) AS items
  FROM "listings_media" AS media
  WHERE media."isDeleted" = false
  GROUP BY media."propertyId"
)
UPDATE "listings" AS listing
SET "media" = COALESCE(listing."media", '[]'::jsonb) || COALESCE((
  SELECT jsonb_agg(candidate.value ORDER BY candidate.ordinality)
  FROM jsonb_array_elements(media_by_listing.items) WITH ORDINALITY AS candidate(value, ordinality)
  WHERE NOT (COALESCE(listing."media", '[]'::jsonb) @> jsonb_build_array(candidate.value))
), '[]'::jsonb)
FROM media_by_listing
WHERE listing."id" = media_by_listing."propertyId";

DROP TABLE "listings_media";
