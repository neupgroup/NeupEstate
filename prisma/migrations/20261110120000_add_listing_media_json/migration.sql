-- Move the cover image into the new media array before removing its column.
ALTER TABLE "listings"
ADD COLUMN "media" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "listings"
SET "media" = jsonb_build_array(
  jsonb_build_object('type', 'image', 'url', "coverImage", 'alt', "title")
)
WHERE "coverImage" IS NOT NULL AND "coverImage" <> '';

ALTER TABLE "listings"
DROP COLUMN "coverImage";
