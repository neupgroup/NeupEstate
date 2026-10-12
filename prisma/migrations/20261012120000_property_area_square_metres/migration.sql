-- Stored property areas are normalized to square metres. Historical values
-- were stored as square feet, including numeric areas in JSON and detail rows.
CREATE FUNCTION public.normalize_property_area_json_20261012(value jsonb, parent_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  entry record;
  area_sqm numeric;
  factor numeric;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  ELSIF jsonb_typeof(value) = 'object' THEN
    IF parent_key = 'area' THEN
      area_sqm := 0;
      FOR entry IN SELECT key, val FROM jsonb_each(value) AS item(key, val) LOOP
        factor := CASE entry.key
          WHEN 'ropani' THEN 508.72 WHEN 'aana' THEN 31.8 WHEN 'paisa' THEN 7.95
          WHEN 'daam' THEN 1.9875 WHEN 'bigha' THEN 6772.63 WHEN 'kattha' THEN 338.63
          WHEN 'dhur' THEN 16.93 WHEN 'sqft' THEN 0.092903 WHEN 'sqm' THEN 1
          ELSE 0 END;
        IF jsonb_typeof(entry.val) = 'number' THEN
          area_sqm := area_sqm + (entry.val #>> '{}')::numeric * factor;
        END IF;
      END LOOP;
      RETURN to_jsonb(area_sqm);
    END IF;
    result := '{}'::jsonb;
    FOR entry IN SELECT key, val FROM jsonb_each(value) AS item(key, val) LOOP
      IF entry.key = 'areaUnit' THEN CONTINUE; END IF;
      IF entry.key IN ('area', 'buildingArea', 'superArea', 'builtUpArea', 'usableArea')
         AND jsonb_typeof(entry.val) = 'number' THEN
        result := result || jsonb_build_object(entry.key, to_jsonb((entry.val #>> '{}')::numeric * 0.092903));
      ELSE
        result := result || jsonb_build_object(entry.key, public.normalize_property_area_json_20261012(entry.val, entry.key));
      END IF;
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(value) = 'array' THEN
    SELECT COALESCE(jsonb_agg(public.normalize_property_area_json_20261012(element, parent_key)), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) AS item(element);
    RETURN result;
  END IF;
  RETURN value;
END;
$$;

UPDATE property
SET details = public.normalize_property_area_json_20261012(details),
    "landDetails" = public.normalize_property_area_json_20261012("landDetails"),
    plots = public.normalize_property_area_json_20261012(plots),
    "apartmentDetails" = public.normalize_property_area_json_20261012("apartmentDetails");

UPDATE property_house_detail SET area = area * 0.092903;
UPDATE property_apartment_detail SET "superArea" = "superArea" * 0.092903,
                                     "builtUpArea" = "builtUpArea" * 0.092903;
UPDATE property_land_detail SET area = area * 0.092903;
UPDATE property_commercial_detail SET "usableArea" = "usableArea" * 0.092903;

ALTER TABLE property DROP COLUMN "areaUnit";

DROP FUNCTION public.normalize_property_area_json_20261012(jsonb, text);
