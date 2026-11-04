-- Preserve the first selected purpose and category in saved listing changes.
-- Nature remains an array and is intentionally left unchanged.
UPDATE "listing_changes"
SET "data" =
  ("data" - 'purposes' - 'categories')
  || jsonb_build_object(
    'purpose', CASE
      WHEN jsonb_typeof("data"->'purposes') = 'array' AND jsonb_array_length("data"->'purposes') > 0
        THEN "data"->'purposes'->0
      WHEN jsonb_typeof("data"->'purpose') = 'array' AND jsonb_array_length("data"->'purpose') > 0
        THEN "data"->'purpose'->0
      ELSE "data"->'purpose'
    END,
    'category', CASE
      WHEN jsonb_typeof("data"->'categories') = 'array' AND jsonb_array_length("data"->'categories') > 0
        THEN "data"->'categories'->0
      WHEN jsonb_typeof("data"->'category') = 'array' AND jsonb_array_length("data"->'category') > 0
        THEN "data"->'category'->0
      ELSE "data"->'category'
    END
  )
WHERE "data" ? 'purposes'
   OR "data" ? 'categories'
   OR jsonb_typeof("data"->'purpose') = 'array'
   OR jsonb_typeof("data"->'category') = 'array';
