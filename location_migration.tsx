import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';

type LocationFields = {
  country?: string;
  province?: string;
  district?: string;
  administrativeArea?: string;
  ward?: string;
  locality?: string;
  subarea?: string;
  postal_code?: string;
};

type LocationInput = {
  listing_id: string;
  raw_location?: unknown;
  closest_match?: unknown;
  location_id?: string | null;
  locationStructured?: string;
  fields_to_add: LocationFields;
};

type LocationRecord = {
  id: string;
  title: string;
  type: string;
  child_of: string | null;
  postal_code: string | null;
  status: string;
};

type PlannedLocation = LocationRecord & { isNew: boolean };

type LocationLevel = {
  field: keyof LocationFields;
  type: string;
  title?: string;
};

const LOCATIONS_FILE = 'locations.txt';
const LOCATION_LEVELS: LocationLevel[] = [
  { field: 'country', type: 'country' },
  { field: 'province', type: 'province' },
  { field: 'district', type: 'area' },
  { field: 'administrativeArea', type: 'municipality' },
  { field: 'ward', type: 'ward' },
  { field: 'locality', type: 'area' },
  { field: 'subarea', type: 'area' },
];

// Normalize location names so exact matches ignore casing and punctuation.
function normalizeLocationName(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Return a stable lookup key for a location beneath a particular parent.
function getLocationKey(title: string, parentId: string | null): string {
  return `${parentId ?? 'root'}:${normalizeLocationName(title)}`;
}

// Convert a populated input field into its canonical display title and location type.
function getLevelValue(level: LocationLevel, fields: LocationFields): { title: string; type: string } | null {
  const value = fields[level.field]?.trim();
  if (!value) return null;

  if (level.field === 'ward') {
    return { title: /^ward\b/i.test(value) ? value : `Ward ${value}`, type: level.type };
  }
  if (level.field === 'administrativeArea') {
    const normalized = normalizeLocationName(value);
    if (normalized.includes('sub metropolitan')) return { title: value, type: 'subMetropolitanCity' };
    if (normalized.includes('metropolitan')) return { title: value, type: 'metropolitanCity' };
    if (normalized.includes('rural municipality')) return { title: value, type: 'ruralMunicipality' };
    if (normalized.includes('municipality')) return { title: value, type: 'municipality' };
  }
  return { title: value, type: level.type };
}

// Load and validate the populated listing-location mapping file.
async function loadLocationInputs(): Promise<LocationInput[]> {
  const contents = await readFile(LOCATIONS_FILE, 'utf8');
  const inputs = JSON.parse(contents) as LocationInput[];
  if (!Array.isArray(inputs)) throw new Error(`${LOCATIONS_FILE} must contain a JSON array.`);

  const listingIds = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    if (!input.listing_id || !input.fields_to_add || typeof input.fields_to_add !== 'object') {
      throw new Error(`Entry ${index + 1} must include listing_id and fields_to_add.`);
    }
    if (listingIds.has(input.listing_id)) throw new Error(`Duplicate listing_id in ${LOCATIONS_FILE}: ${input.listing_id}`);
    listingIds.add(input.listing_id);
    if (!LOCATION_LEVELS.some((level) => Boolean(input.fields_to_add[level.field]?.trim()))) {
      throw new Error(`Entry ${index + 1} has no location hierarchy values.`);
    }
  }
  return inputs;
}

// Read active location rows and listings so the preview can validate every mapping.
async function readDatabaseState(client: PoolClient): Promise<{
  locations: LocationRecord[];
  listingIds: Set<string>;
}> {
  const [{ rows: locations }, { rows: listings }] = await Promise.all([
    client.query<LocationRecord>(`
      SELECT "id", "title", "type", "child_of", "postal_code", "status"
      FROM "locations"
      WHERE "status" = 'active'
    `),
    client.query<{ id: string }>('SELECT "id" FROM "listings"'),
  ]);
  return { locations, listingIds: new Set(listings.map((listing) => listing.id)) };
}

// Build the exact parent-child path and plan missing location rows in memory.
function planLocationHierarchy(
  input: LocationInput,
  locationByKey: Map<string, PlannedLocation>,
  newLocations: PlannedLocation[],
): string {
  let parentId: string | null = null;
  let deepestLocationId: string | null = null;

  for (const level of LOCATION_LEVELS) {
    const value = getLevelValue(level, input.fields_to_add);
    if (!value) continue;

    const key = getLocationKey(value.title, parentId);
    let location = locationByKey.get(key);
    if (!location) {
      location = {
        id: randomUUID(),
        title: value.title,
        type: value.type,
        child_of: parentId,
        postal_code: null,
        status: 'active',
        isNew: true,
      };
      locationByKey.set(key, location);
      newLocations.push(location);
    }
    parentId = location.id;
    deepestLocationId = location.id;
  }

  if (!deepestLocationId) throw new Error(`No location could be resolved for listing ${input.listing_id}.`);
  const postalCode = input.fields_to_add.postal_code?.trim();
  if (postalCode) {
    const deepestLocation = [...locationByKey.values()].find((location) => location.id === deepestLocationId);
    if (deepestLocation && !deepestLocation.postal_code) deepestLocation.postal_code = postalCode;
  }
  return deepestLocationId;
}

// Insert planned hierarchy rows and update listing location IDs in one transaction.
async function applyLocationChanges(
  client: PoolClient,
  inputs: LocationInput[],
  newLocations: PlannedLocation[],
  locationIdsByListing: Map<string, string>,
): Promise<void> {
  for (const location of newLocations) {
    await client.query(`
      INSERT INTO "locations" ("id", "title", "type", "child_of", "postal_code", "status")
      VALUES ($1::uuid, $2, $3, $4::uuid, $5, 'active')
    `, [location.id, location.title, location.type, location.child_of, location.postal_code]);
  }

  for (const input of inputs) {
    const locationId = locationIdsByListing.get(input.listing_id);
    if (!locationId) throw new Error(`No resolved location ID for listing ${input.listing_id}.`);
    const result = await client.query(
      'UPDATE "listings" SET "location" = $1::uuid WHERE "id" = $2',
      [locationId, input.listing_id],
    );
    if (result.rowCount !== 1) throw new Error(`Expected to update listing ${input.listing_id}; updated ${result.rowCount ?? 0}.`);
  }
}

// Save the successful listing-to-location IDs back into the input file.
async function saveLocationIds(inputs: LocationInput[], locationIdsByListing: Map<string, string>): Promise<void> {
  const output = inputs.map((input) => {
    const locationId = locationIdsByListing.get(input.listing_id);
    if (!locationId) throw new Error(`No resolved location ID for listing ${input.listing_id}.`);
    return { ...input, location_id: locationId, locationStructured: locationId };
  });
  await writeFile(LOCATIONS_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

// Resolve all curated location paths, preview by default, and apply only with --apply.
async function migrateListingStructuredLocations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  const apply = process.argv.includes('--apply');
  const inputs = await loadLocationInputs();
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { locations, listingIds } = await readDatabaseState(client);
    const missingListings = inputs.filter((input) => !listingIds.has(input.listing_id));
    if (missingListings.length > 0) {
      throw new Error(`Unknown listing IDs in ${LOCATIONS_FILE}: ${missingListings.map((item) => item.listing_id).join(', ')}`);
    }

    const locationByKey = new Map<string, PlannedLocation>();
    for (const location of locations) {
      const key = getLocationKey(location.title, location.child_of);
      const existing = locationByKey.get(key);
      if (!existing || location.id.localeCompare(existing.id) < 0) {
        locationByKey.set(key, { ...location, isNew: false });
      }
    }

    const newLocations: PlannedLocation[] = [];
    const locationIdsByListing = new Map<string, string>();
    for (const input of inputs) {
      locationIdsByListing.set(input.listing_id, planLocationHierarchy(input, locationByKey, newLocations));
    }

    if (apply) {
      await applyLocationChanges(client, inputs, newLocations, locationIdsByListing);
      await client.query('COMMIT');
      await saveLocationIds(inputs, locationIdsByListing);
      console.log(`Updated ${inputs.length} listing(s), created ${newLocations.length} location row(s), and saved IDs to ${LOCATIONS_FILE}.`);
    } else {
      await client.query('ROLLBACK');
      console.log(`Preview: ${inputs.length} listing(s) will be updated; ${newLocations.length} location row(s) would be created.`);
      console.log('Run with --apply to commit the location rows and listing updates.');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateListingStructuredLocations().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
