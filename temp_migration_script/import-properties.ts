/*
::neup.documentation::propertyinnepal-sql-property-migration

Imports property rows from `temp_migration_script/index.sql` into the local
Prisma/Postgres property schema.

The script parses only the source MySQL `properties` and `media` INSERT
statements, maps source listing fields into the app's `property` model, creates
detail/media/price rows, associates each listing with the configured account,
and marks listings as approved.

Run a dry parse:

```sh
npx tsx temp_migration_script/import-properties.ts
```

Execute the migration:

```sh
npx tsx temp_migration_script/import-properties.ts --execute
```

::end
*/

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import slugify from 'slugify';
import { prisma } from '@/core/database/prisma';

const SOURCE_SQL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.sql');
const MEDIA_BASE_URL = 'https://api.propertyinnepal.com.np/storage';
const MIGRATION_ACCOUNT_ID = '8a8a5764-860b-452a-b963-d0f4b9d2a54c';
const MIGRATION_NEUP_ID = 'rameshbarudi';
const EXECUTE = process.argv.includes('--execute');
const SAMPLE = process.argv.includes('--sample');

type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

type SourceProperty = {
  id: string;
  code: string;
  type: string;
  for: string | null;
  name: string;
  location: string;
  price: string | null;
  area: string | null;
  features: string | null;
  slug: string | null;
  views: number;
  description: string | null;
  youtube_link: string | null;
  is_featured: number;
  is_premium: number;
  sold_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  tiktok_link: string | null;
  city: string | null;
  phone_number: string | null;
  reference: string | null;
  owner_name: string | null;
  remarks: string | null;
  reported_by: string | null;
  on_calling: number;
  team_id: number | null;
};

type SourceMedia = {
  id: number;
  model_type: string;
  model_id: string;
  file_name: string;
  mime_type: string | null;
  order_column: number | null;
  created_at: string | null;
};

type Feature = {
  name?: unknown;
  value?: unknown;
  icon?: unknown;
};

function readInsertRows(sql: string, table: string): Row[] {
  const rows: Row[] = [];
  const prefix = `INSERT INTO \`${table}\``;
  let statement = '';
  let collecting = false;

  for (const line of sql.split(/\r?\n/)) {
    if (!collecting && line.startsWith(prefix)) {
      statement = line;
      collecting = true;
    } else if (collecting) {
      statement += `\n${line}`;
    }

    if (collecting && line.endsWith(';')) {
      rows.push(...parseInsertStatement(statement, table));
      statement = '';
      collecting = false;
    }
  }

  return rows;
}

function parseInsertStatement(statement: string, table: string): Row[] {
  const header = new RegExp(`INSERT INTO \`${table}\` \\(([^)]+)\\) VALUES\\s*`, 's');
  const match = statement.match(header);
  if (!match?.[1]) return [];

  const columns = match[1].split(',').map((column) => column.trim().replace(/^`|`$/g, ''));
  const valuesStart = match.index! + match[0].length;
  const tuples = splitTuples(statement.slice(valuesStart).replace(/;\s*$/, ''));

  return tuples.map((tuple) => {
    const values = parseTupleValues(tuple);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]));
  });
}

function splitTuples(input: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let inString = false;
  let start = -1;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const previous = input[i - 1];

    if (char === "'" && previous !== '\\') {
      inString = !inString;
    }

    if (inString) continue;

    if (char === '(') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        tuples.push(input.slice(start, i));
        start = -1;
      }
    }
  }

  return tuples;
}

function parseTupleValues(tuple: string): SqlValue[] {
  const values: SqlValue[] = [];
  let token = '';
  let inString = false;
  let wasString = false;

  function pushToken() {
    values.push(normalizeSqlToken(token, wasString));
    token = '';
    wasString = false;
  }

  for (let i = 0; i < tuple.length; i += 1) {
    const char = tuple[i];

    if (inString) {
      if (char === '\\') {
        const next = tuple[i + 1];
        if (next !== undefined) {
          token += decodeMysqlEscape(next);
          i += 1;
        }
        continue;
      }
      if (char === "'") {
        inString = false;
        wasString = true;
        continue;
      }
      token += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ',') {
      pushToken();
      continue;
    }

    token += char;
  }

  pushToken();
  return values;
}

function decodeMysqlEscape(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    case '0':
      return '\0';
    default:
      return char;
  }
}

function normalizeSqlToken(token: string, wasString: boolean): SqlValue {
  if (wasString) return token;
  const trimmed = token.trim();
  if (!trimmed || /^null$/i.test(trimmed)) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function asString(value: SqlValue): string | null {
  return typeof value === 'string' ? value.trim() : value == null ? null : String(value).trim();
}

function asNumber(value: SqlValue): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

function truncate(value: string | null | undefined, max: number): string {
  return (value ?? '').substring(0, max);
}

function parseJsonFeatures(value: string | null): Feature[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function featureValue(features: Feature[], name: string): string | null {
  const normalizedName = name.toLowerCase();
  const feature = features.find((item) => String(item.name ?? '').trim().toLowerCase() === normalizedName);
  return feature?.value == null ? null : String(feature.value);
}

function firstNumber(value: string | null): number {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseAreaToSqft(rawArea: string | null): number {
  if (!rawArea) return 0;
  const normalized = rawArea.trim().toLowerCase();
  const dashMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (dashMatch) {
    const [, ropani, aana, paisa, daam] = dashMatch.map(Number);
    return ropani * 5476 + aana * 342.25 + paisa * 85.56 + daam * 21.39;
  }

  const unitFactors: Array<[RegExp, number]> = [
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:ropani|ropani\.)(?:\s|$)/g, 5476],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:aana|anna|ana)(?:\s|$)/g, 342.25],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:paisa|paisa\.)(?:\s|$)/g, 85.56],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:daam|dam)(?:\s|$)/g, 21.39],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:bigha)(?:\s|$)/g, 72900],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:kattha|katha)(?:\s|$)/g, 3645],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:dhur)(?:\s|$)/g, 182.25],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square feet)(?:\s|$)/g, 1],
    [/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:sqm|sq\.?\s*m|square meter)(?:\s|$)/g, 10.7639],
  ];

  let total = 0;
  for (const [pattern, factor] of unitFactors) {
    for (const match of normalized.matchAll(pattern)) {
      total += Number(match[1]) * factor;
    }
  }

  return total || firstNumber(normalized);
}

function parsePrice(rawPrice: string | null): number {
  if (!rawPrice) return 0;
  const normalized = rawPrice.replace(/,/g, '').toLowerCase();
  let total = 0;

  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*(crore|cr|karod|lakh|lakhs|lac|arab|thousand|k)?/g)) {
    const amount = Number(match[1]);
    const unit = match[2] ?? '';
    if (unit === 'arab') total += amount * 1_000_000_000;
    else if (unit === 'crore' || unit === 'cr' || unit === 'karod') total += amount * 10_000_000;
    else if (unit === 'lakh' || unit === 'lakhs' || unit === 'lac') total += amount * 100_000;
    else if (unit === 'thousand' || unit === 'k') total += amount * 1_000;
    else total += amount;
  }

  return total;
}

function mapType(type: string): 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL' {
  switch (type.trim().toLowerCase()) {
    case 'apartment':
      return 'APARTMENT';
    case 'land':
      return 'LAND';
    case 'commercialproperty':
    case 'semicommercialproperty':
      return 'COMMERCIAL';
    case 'house':
    case 'colonyhouse':
    default:
      return 'HOUSE';
  }
}

function mapPurpose(value: string | null): 'SALE' | 'RENT' | 'LEASE' {
  switch (value?.trim().toLowerCase()) {
    case 'rent':
    case 'rented':
      return 'RENT';
    case 'under-construction':
      return 'SALE';
    case 'sale':
    case 'sold':
    default:
      return 'SALE';
  }
}

function mapStatus(value: string | null): 'ACTIVE' | 'SOLD' | 'RENTED' {
  switch (value?.trim().toLowerCase()) {
    case 'sold':
      return 'SOLD';
    case 'rented':
      return 'RENTED';
    default:
      return 'ACTIVE';
  }
}

function areaUnit(rawArea: string | null): string {
  const normalized = rawArea?.toLowerCase() ?? '';
  if (normalized.includes('sq')) return 'sqft';
  if (normalized.includes('bigha')) return 'bigha';
  if (normalized.includes('kattha') || normalized.includes('katha')) return 'kattha';
  if (normalized.includes('dhur')) return 'dhur';
  if (normalized.includes('ropani')) return 'ropani';
  if (normalized.includes('aana') || normalized.includes('anna') || normalized.includes('ana') || normalized.includes('-')) return 'aana';
  return '';
}

function sourceProperty(row: Row): SourceProperty {
  return {
    id: asString(row.id)!,
    code: asString(row.code) ?? '',
    type: asString(row.type) ?? 'house',
    for: asString(row.for),
    name: asString(row.name) ?? 'Property',
    location: asString(row.location) ?? '',
    price: asString(row.price),
    area: asString(row.area),
    features: asString(row.features),
    slug: asString(row.slug),
    views: asNumber(row.views),
    description: asString(row.description),
    youtube_link: asString(row.youtube_link),
    is_featured: asNumber(row.is_featured),
    is_premium: asNumber(row.is_premium),
    sold_date: asString(row.sold_date),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    tiktok_link: asString(row.tiktok_link),
    city: asString(row.city),
    phone_number: asString(row.phone_number),
    reference: asString(row.reference),
    owner_name: asString(row.owner_name),
    remarks: asString(row.remarks),
    reported_by: asString(row.reported_by),
    on_calling: asNumber(row.on_calling),
    team_id: row.team_id == null ? null : asNumber(row.team_id),
  };
}

function sourceMedia(row: Row): SourceMedia {
  return {
    id: asNumber(row.id),
    model_type: asString(row.model_type) ?? '',
    model_id: asString(row.model_id) ?? '',
    file_name: asString(row.file_name) ?? '',
    mime_type: asString(row.mime_type),
    order_column: row.order_column == null ? null : asNumber(row.order_column),
    created_at: asString(row.created_at),
  };
}

function mediaUrl(media: SourceMedia): string {
  return `${MEDIA_BASE_URL}/${media.id}/${media.file_name}`;
}

function dateOrUndefined(value: string | null): Date | undefined {
  return value ? new Date(value.replace(' ', 'T')) : undefined;
}

function propertyDetails(property: SourceProperty, features: Feature[], areaSqft: number) {
  return {
    bedrooms: firstNumber(featureValue(features, 'bedroom')),
    bathrooms: firstNumber(featureValue(features, 'bathroom')),
    kitchens: firstNumber(featureValue(features, 'kitchen')),
    livingRooms: firstNumber(featureValue(features, 'living room')),
    floors: firstNumber(featureValue(features, 'floor')),
    facing: featureValue(features, 'faced') ?? '',
    furnishing: featureValue(features, 'furnishing'),
    parking: featureValue(features, 'parking'),
    area: areaSqft,
    source: {
      system: 'propertyinnepal_prod',
      table: 'properties',
      id: property.id,
      code: property.code,
      originalType: property.type,
      originalFor: property.for,
      rawPrice: property.price,
      rawArea: property.area,
      city: property.city,
      views: property.views,
      youtubeLink: property.youtube_link,
      tiktokLink: property.tiktok_link,
      phoneNumber: property.phone_number,
      reference: property.reference,
      ownerName: property.owner_name,
      remarks: property.remarks,
      reportedBy: property.reported_by,
      onCalling: property.on_calling,
      teamId: property.team_id,
      soldDate: property.sold_date,
      features,
    },
  };
}

async function buildUniqueSlug(property: SourceProperty): Promise<string> {
  const base = slugify(property.slug || property.name || property.code || property.id, {
    lower: true,
    strict: true,
    trim: true,
  }) || 'property';
  const suffix = property.code || property.id.slice(0, 8);
  let candidate = `${base}-${suffix}`.substring(0, 120);
  const existing = await prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } });
  if (!existing || existing.id === property.id) return candidate;

  candidate = `${base}-${property.id.slice(0, 8)}`.substring(0, 120);
  const secondExisting = await prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } });
  if (!secondExisting || secondExisting.id === property.id) return candidate;

  return `${base}-${property.id}`.substring(0, 120);
}

async function ensureMigrationAccount() {
  await prisma.account.upsert({
    where: { id: MIGRATION_ACCOUNT_ID },
    create: {
      id: MIGRATION_ACCOUNT_ID,
      neupId: MIGRATION_NEUP_ID,
      accountType: 'individual',
      displayName: 'Ramesh Barudi',
    },
    update: {
      neupId: MIGRATION_NEUP_ID,
    },
  });
}

async function upsertProperty(property: SourceProperty, media: SourceMedia[]) {
  const type = mapType(property.type);
  const purpose = mapPurpose(property.for);
  const status = mapStatus(property.for);
  const features = parseJsonFeatures(property.features);
  const areaSqft = parseAreaToSqft(property.area);
  const price = parsePrice(property.price);
  const images = media
    .filter((item) => item.model_type === 'App\\Models\\Property' && item.file_name)
    .sort((left, right) => (left.order_column ?? left.id) - (right.order_column ?? right.id))
    .map(mediaUrl);
  const createdAt = dateOrUndefined(property.created_at);
  const updatedAt = dateOrUndefined(property.updated_at);
  const details = propertyDetails(property, features, areaSqft);
  const data = {
    id: property.id,
    slug: await buildUniqueSlug(property),
    title: truncate(property.name, 255),
    description: property.description ?? '',
    coverImage: truncate(images[0] ?? '', 255),
    type,
    purpose,
    status,
    currency: 'NPR',
    displayPrice: price,
    displayPriceUnit: property.price ? 'total' : '',
    areaUnit: areaUnit(property.area),
    locationText: truncate([property.location, property.city].filter(Boolean).join(', '), 255),
    geoLocation: '',
    structuredLocation: JSON.stringify({
      locality: property.location,
      city: property.city,
      source: 'propertyinnepal_prod',
    }),
    agency: null,
    agent: MIGRATION_ACCOUNT_ID,
    isFeatured: Boolean(property.is_featured || property.is_premium),
    isApproved: true,
    isDeleted: false,
    customId: property.code || property.id,
    amenities: features.map((feature) => String(feature.name ?? '').trim()).filter(Boolean),
    metaTags: [
      property.type,
      property.for,
      property.location,
      property.city,
      property.reference,
    ].filter((value): value is string => Boolean(value)),
    pricing: {
      raw: property.price,
      parsed: price,
      currency: 'NPR',
      basis: property.price ? 'total' : '',
    },
    details,
    createdAt,
    updatedAt,
  };

  await prisma.$transaction(async (tx) => {
    await tx.property.upsert({
      where: { id: property.id },
      create: data as any,
      update: data as any,
    });

    await tx.propertyMedia.deleteMany({ where: { propertyId: property.id } });
    if (images.length) {
      await tx.propertyMedia.createMany({
        data: images.map((url, index) => ({
          propertyId: property.id,
          type: 'photo',
          url,
          alt: property.name,
          sortOrder: index,
          isPrimary: index === 0,
          createdAt: media[index]?.created_at ? new Date(media[index].created_at!.replace(' ', 'T')) : undefined,
        })),
      });
    }

    await tx.propertyPrice.deleteMany({ where: { propertyId: property.id } });
    if (price > 0) {
      await tx.propertyPrice.create({
        data: {
          propertyId: property.id,
          for: property.for ?? purpose.toLowerCase(),
          currency: 'NPR',
          unit: 'total',
          price,
          priceUnit: truncate(property.price, 24),
        },
      });
    }

    if (type === 'HOUSE') {
      await tx.propertyHouseDetail.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          floors: details.floors,
          kitchens: details.kitchens,
          livingRooms: details.livingRooms,
          diningRooms: 0,
          carParkingSpots: details.parking ? firstNumber(details.parking) : 0,
          bikeParkingSpots: 0,
          furnished: String(details.furnishing ?? '').toLowerCase().includes('full'),
          buildYear: 0,
          area: areaSqft,
          facing: details.facing,
          roadAccess: 0,
        },
        update: {
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          floors: details.floors,
          kitchens: details.kitchens,
          livingRooms: details.livingRooms,
          area: areaSqft,
          facing: details.facing,
        },
      });
    } else if (type === 'APARTMENT') {
      await tx.propertyApartmentDetail.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          onFloor: 0,
          totalFloors: details.floors,
          balconies: 0,
          lifts: 0,
          carParkingSpots: details.parking ? firstNumber(details.parking) : 0,
          bikeParkingSpots: 0,
          furnished: String(details.furnishing ?? '').toLowerCase().includes('full'),
          blockName: '',
          unitNumber: '',
          superArea: areaSqft,
          builtUpArea: areaSqft,
          maintenanceFee: 0,
        },
        update: {
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          totalFloors: details.floors,
          superArea: areaSqft,
          builtUpArea: areaSqft,
        },
      });
    } else if (type === 'LAND') {
      await tx.propertyLandDetail.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          area: areaSqft,
          facing: details.facing,
          roadAccess: 0,
          plotShape: '',
          cornerPlot: false,
          waterAvailable: false,
          electricityAvailable: false,
          boundaryWall: false,
        },
        update: {
          area: areaSqft,
          facing: details.facing,
        },
      });
    } else {
      await tx.propertyCommercialDetail.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          floor: details.floors,
          washrooms: details.bathrooms,
          parkingSpots: details.parking ? firstNumber(details.parking) : 0,
          frontage: 0,
          usableArea: areaSqft,
          buildingType: property.type,
        },
        update: {
          floor: details.floors,
          washrooms: details.bathrooms,
          usableArea: areaSqft,
        },
      });
    }

    const existingMigrationLog = await tx.propertyLog.findFirst({
      where: {
        propertyId: property.id,
        requestedBy: MIGRATION_ACCOUNT_ID,
        approvedBy: MIGRATION_ACCOUNT_ID,
      },
      select: { id: true },
    });
    if (!existingMigrationLog) {
      await tx.propertyLog.create({
        data: {
          propertyId: property.id,
          requestedBy: MIGRATION_ACCOUNT_ID,
          approvedBy: MIGRATION_ACCOUNT_ID,
          approvedOn: new Date(),
          data: [{
            action: 'migrated',
            source: 'propertyinnepal_prod.properties',
            sourceId: property.id,
            sourceCode: property.code,
          }],
        },
      });
    }
  });
}

async function main() {
  const sql = fs.readFileSync(SOURCE_SQL, 'utf8');
  const properties = readInsertRows(sql, 'properties').map(sourceProperty);
  const media = readInsertRows(sql, 'media')
    .map(sourceMedia)
    .filter((item) => item.model_type === 'App\\Models\\Property');
  const mediaByProperty = new Map<string, SourceMedia[]>();

  for (const item of media) {
    const current = mediaByProperty.get(item.model_id) ?? [];
    current.push(item);
    mediaByProperty.set(item.model_id, current);
  }

  const attachedMediaCount = properties.reduce(
    (count, property) => count + (mediaByProperty.get(property.id)?.length ?? 0),
    0,
  );
  const withImages = properties.filter((property) => (mediaByProperty.get(property.id)?.length ?? 0) > 0).length;
  const sold = properties.filter((property) => property.for === 'sold').length;
  const rented = properties.filter((property) => property.for === 'rented').length;
  const active = properties.length - sold - rented;

  console.log(`Parsed ${properties.length} properties and ${media.length} property media rows.`);
  console.log(`${attachedMediaCount} media rows are attached to parsed properties.`);
  console.log(`${withImages} properties have at least one image.`);
  console.log(`Status mapping: ${active} ACTIVE, ${sold} SOLD, ${rented} RENTED. All rows get isApproved=true.`);

  if (SAMPLE) {
    console.log(JSON.stringify({
      firstProperty: properties[0],
      firstMedia: media[0],
      firstRawMedia: readInsertRows(sql, 'media')[0],
    }, null, 2));
  }

  if (!EXECUTE) {
    console.log('Dry run only. Re-run with --execute to write to the database.');
    return;
  }

  await ensureMigrationAccount();

  let migrated = 0;
  for (const property of properties) {
    await upsertProperty(property, mediaByProperty.get(property.id) ?? []);
    migrated += 1;
    if (migrated % 25 === 0) {
      console.log(`Migrated ${migrated}/${properties.length} properties...`);
    }
  }

  console.log(`Migrated ${migrated} properties for account ${MIGRATION_ACCOUNT_ID} (${MIGRATION_NEUP_ID}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
