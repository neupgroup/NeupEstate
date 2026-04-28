# Prisma Adapter Rewrite - Changes Required

## Overview
Rewrite the Prisma adapter to work with the new normalized schema where property details are split into separate tables and enums are used instead of text fields.

---

## PHASE 1: Schema Adjustments

### 1.1 Add missing fields to Property table
- ✅ `updatedAt` - DONE (already added)
- Add `sourceUrl` field (for scraped properties)
- Add JSON fields for backward compatibility:
  - `fetchHistory` (Json?)
  - `imageFetchHistory` (Json?)
  - `pricing` (Json?)
  - `roadAccessDetails` (Json?)
  - `distancing` (Json?)
  - `earnings` (Json?)
  - `owners` (Json?)
  - `documents` (Json?)
  - `landDetails` (Json?)
  - `plots` (Json?)
  - `apartmentDetails` (Json?)
  - `apartmentUnits` (Json?)
  - `metaTitle` (String?)
  - `metaDescription` (String?)
  - `metaTags` (String[])
  - `amenities` (String[])

### 1.2 Fix Agency model
- Remove `website` field (marked for drop in schema.md)
- Remove `contactPersonName` field (marked for drop in schema.md)
- Remove `contactPersonRole` field (marked for drop in schema.md)

### 1.3 Fix Requirement model
- Change `trackerId` to `userId` (to match adapter usage)
- Remove `currency`, `pricingUnit`, `locationGeoCoordinates`, `locationStructured` (not used by adapter)
- Add `minBudget`, `maxBudget` (Int?)
- Change `minPrice`/`maxPrice` to `minBudget`/`maxBudget`
- Change `type` to `propertyType` (String[])

### 1.4 Fix Account model
- Add missing fields that adapter tries to use:
  - `name` (String?)
  - `location` (String?)
  - `registered` (Boolean)
  - `createdOn` (DateTime)
  - `accessedOn` (DateTime)
  - `createdFromIp` (String?)
  - `lastAccessedFromIp` (String?)
- Remove `lastActiveOn` (not used)

---

## PHASE 2: Enum Mapping Utilities

### 2.1 Create enum mapper functions
- `mapPurposeToEnum()` - "Sale" → SALE, "Rent" → RENT, "Lease" → LEASE
- `mapPurposeFromEnum()` - SALE → "Sale", RENT → "Rent", LEASE → "Lease"
- `mapTypeToEnum()` - "House" → HOUSE, "Apartment" → APARTMENT, "Land" → LAND, "Flat" → APARTMENT
- `mapTypeFromEnum()` - HOUSE → "House", APARTMENT → "Apartment", LAND → "Land", COMMERCIAL → "Commercial"
- `mapStatusToEnum()` - "pending" → PENDING, "approved" → ACTIVE, "sold" → SOLD
- `mapStatusFromEnum()` - PENDING → "pending", ACTIVE → "approved", SOLD → "sold"

---

## PHASE 3: Property Read Operations (Denormalization)

### 3.1 Update `mapPropertyRecord()` function
- Read from normalized schema (property + detail tables + media)
- Assemble flat Property object
- Map enums back to app strings
- Extract images from `property_media` table
- Extract price from `property_price` table or `displayPrice`
- Extract location from `locationText`
- Extract detail fields from appropriate sub-table based on `type`:
  - HOUSE → `property_house_detail`
  - APARTMENT → `property_apartment_detail`
  - LAND → `property_land_detail`
  - COMMERCIAL → `property_commercial_detail`
- Handle agency as string FK (not JSON object)
- Handle agent as string FK (not `listingAgent`)
- Map `coverImage` to first image in array
- Map `geoLocation` to `latitude`/`longitude` (parse "lat,lng" format)
- Map `structuredLocation` from string to JSON

### 3.2 Update all read queries to include relations
Add `include` to all `findMany`, `findUnique`, `findFirst`:
```typescript
include: {
  media: { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' } },
  houseDetail: true,
  apartmentDetail: true,
  landDetail: true,
  commercialDetail: true,
  prices: true,
}
```

### 3.3 Update queries that filter by old fields
- `where: { purpose }` → map to enum first
- `where: { status }` → map to enum first
- `where: { price }` → use `displayPrice`
- `where: { location }` → use `locationText`
- `where: { listingAgent }` → use `agent`

---

## PHASE 4: Property Write Operations (Normalization)

### 4.1 Update `buildPropertyData()` function
- Map app strings to enums
- Extract `price` → `displayPrice`
- Extract `location` → `locationText`
- Extract first image → `coverImage`
- Extract `latitude`/`longitude` → `geoLocation` (format: "lat,lng")
- Remove fields that go to detail tables (bedrooms, bathrooms, area, etc.)
- Remove fields that go to media table (images)
- Map `agency` JSON → `agency` string FK
- Map `listingAgent` → `agent`

### 4.2 Create `createPropertyWithDetails()` helper
- Create main property record
- Determine property type
- Create appropriate detail record based on type:
  - HOUSE → create `property_house_detail`
  - APARTMENT → create `property_apartment_detail`
  - LAND → create `property_land_detail`
  - COMMERCIAL → create `property_commercial_detail`
- Create `property_media` records from images array
- Create `property_price` records if pricing data exists

### 4.3 Update `addProperty()` method
- Use new `createPropertyWithDetails()` helper
- Map status "pending" → PENDING enum

### 4.4 Update `createProperty()` method
- Use new `createPropertyWithDetails()` helper
- Map status "approved" → ACTIVE enum

### 4.5 Update `updateProperty()` method
- Update main property record
- Update or create appropriate detail record
- Update media records (delete old, create new)
- Update price records

### 4.6 Update `updatePropertyImages()` method
- Delete existing media records
- Create new media records from images array

### 4.7 Remove methods that use removed fields
- `addFetchToHistory()` - keep as-is (uses JSON field)
- `deleteFetchHistoryItem()` - keep as-is (uses JSON field)
- `addImagesToFetchHistory()` - keep as-is (uses JSON field)
- `deleteImageFetchHistoryItem()` - keep as-is (uses JSON field)

---

## PHASE 5: Agency Operations

### 5.1 Update `createAgency()` method
- Remove `website`, `contactPersonName`, `contactPersonRole` fields

### 5.2 Update `getAgencies()` method
- Remove `website`, `contactPersonName`, `contactPersonRole` from return mapping

### 5.3 Update `getFeaturedAgencies()` method
- Remove `website`, `contactPersonName`, `contactPersonRole` from return mapping

### 5.4 Update `getAgencyById()` method
- Remove `website`, `contactPersonName`, `contactPersonRole` from return mapping

### 5.5 Update `updateAgency()` method
- Remove `website`, `contactPersonName`, `contactPersonRole` fields

---

## PHASE 6: Requirement Operations

### 6.1 Update `createRequirement()` method
- Change `userId` field usage (already correct)
- Use `minBudget`/`maxBudget` instead of `minPrice`/`maxPrice`
- Use `propertyType` instead of `type`

### 6.2 Update `mapRequirementRecord()` method
- Map `minBudget`/`maxBudget` to return object
- Map `propertyType` to return object

### 6.3 Update `updateRequirement()` method
- Use `minBudget`/`maxBudget` instead of `minPrice`/`maxPrice`
- Use `propertyType` instead of `type`

---

## PHASE 7: Account Operations

### 7.1 Update `createTemporaryAccount()` method
- Use correct field names: `createdOn`, `accessedOn`, `createdFromIp`, `lastAccessedFromIp`
- Add `registered` and `name`, `location` fields

### 7.2 Update `mapAccountRecord()` method
- Map from correct field names

### 7.3 Update `updateAccountAccess()` method
- Use `accessedOn` and `lastAccessedFromIp` field names

### 7.4 Update `getAccounts()` method
- Fix orderBy to use correct field name

---

## PHASE 8: SavedProperty Operations

### 8.1 Update `getLatestSavedProperties()` method
- Remove `account.name` reference (Account model doesn't have name in normalized schema)
- Use fallback or join with User table if needed

### 8.2 Update `getUsersBySavedProperty()` method
- Fix `mapAccountToUser()` to handle missing fields gracefully

---

## PHASE 9: Testing & Validation

### 9.1 Test property creation
- Create House property → verify detail table populated
- Create Apartment property → verify detail table populated
- Create Land property → verify detail table populated
- Create Commercial property → verify detail table populated

### 9.2 Test property reads
- Verify flat Property object assembled correctly
- Verify enums mapped back to strings
- Verify images extracted from media table
- Verify detail fields extracted from correct sub-table

### 9.3 Test property updates
- Update property → verify detail table updated
- Update images → verify media table updated

### 9.4 Test filters
- Filter by purpose → verify enum mapping works
- Filter by type → verify enum mapping works
- Filter by status → verify enum mapping works

---

## PHASE 10: Cleanup

### 10.1 Remove unused code
- Remove references to removed fields
- Remove old mapping logic

### 10.2 Update types if needed
- Ensure TypeScript types match new schema

---

## Execution Order

1. ✅ Phase 1.1 - Add updatedAt (DONE)
2. Phase 1.2 - Fix Agency model
3. Phase 1.3 - Fix Requirement model  
4. Phase 1.4 - Fix Account model
5. Phase 1.1 (remaining) - Add JSON fields to Property
6. Phase 2 - Create enum mappers
7. Phase 3 - Update read operations
8. Phase 4 - Update write operations
9. Phase 5 - Fix Agency operations
10. Phase 6 - Fix Requirement operations
11. Phase 7 - Fix Account operations
12. Phase 8 - Fix SavedProperty operations
13. Phase 9 - Test everything
14. Phase 10 - Cleanup
