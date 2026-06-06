-- Set area / road access precision to DECIMAL(10,8) for canonical meter-based values.

ALTER TABLE "property_house_detail"
  ALTER COLUMN "area" TYPE DECIMAL(10,8) USING "area"::DECIMAL(10,8),
  ALTER COLUMN "roadAccess" TYPE DECIMAL(10,8) USING "roadAccess"::DECIMAL(10,8);

ALTER TABLE "property_apartment_detail"
  ALTER COLUMN "superArea" TYPE DECIMAL(10,8) USING "superArea"::DECIMAL(10,8),
  ALTER COLUMN "builtUpArea" TYPE DECIMAL(10,8) USING "builtUpArea"::DECIMAL(10,8),
  ALTER COLUMN "maintenanceFee" TYPE DECIMAL(10,8) USING "maintenanceFee"::DECIMAL(10,8);

ALTER TABLE "property_land_detail"
  ALTER COLUMN "area" TYPE DECIMAL(10,8) USING "area"::DECIMAL(10,8),
  ALTER COLUMN "roadAccess" TYPE DECIMAL(10,8) USING "roadAccess"::DECIMAL(10,8);

ALTER TABLE "property_commercial_detail"
  ALTER COLUMN "frontage" TYPE DECIMAL(10,8) USING "frontage"::DECIMAL(10,8),
  ALTER COLUMN "usableArea" TYPE DECIMAL(10,8) USING "usableArea"::DECIMAL(10,8);
