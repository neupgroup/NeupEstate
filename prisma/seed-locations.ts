import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './client/index.js';

type Municipality = { name: string; type: string };
type LocationData = Record<string, Record<string, Municipality[]>>;
type LocationRow = { id: string; title: string; type: string; childOf: string | null };
type LocationTransaction = Prisma.TransactionClient;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

// Converts JSON keys and district identifiers into readable location titles.
function titleCase(value: string): string {
  return value.split(/[-_\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

// Keeps imported location types consistent with the camelCase management vocabulary.
function normalizeType(type: string): string {
  return type.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

// Builds the country, province, district, and municipality rows from source JSON.
function buildLocationRows(source: LocationData): LocationRow[] {
  const rows: LocationRow[] = [];
  const countryId = randomUUID();
  rows.push({ id: countryId, title: 'Nepal', type: 'country', childOf: null });

  for (const [provinceName, districts] of Object.entries(source)) {
    const provinceId = randomUUID();
    rows.push({ id: provinceId, title: titleCase(provinceName), type: 'province', childOf: countryId });

    for (const [districtName, municipalities] of Object.entries(districts)) {
      const districtId = randomUUID();
      rows.push({ id: districtId, title: titleCase(districtName), type: 'area', childOf: provinceId });
      for (const municipality of municipalities) {
        rows.push({
          id: randomUUID(),
          title: municipality.name,
          type: normalizeType(municipality.type),
          childOf: districtId,
        });
      }
    }
  }
  return rows;
}

// Creates new rows and reactivates matching records in a short bulk transaction.
async function importLocations(): Promise<number> {
  const filePath = path.join(process.cwd(), 'locations.json');
  const source = JSON.parse(await readFile(filePath, 'utf8')) as LocationData;
  const inputRows = buildLocationRows(source);

  return prisma.$transaction(async (transaction: LocationTransaction) => {
    const existingRows = await transaction.location.findMany({
      select: { id: true, title: true, type: true, childOf: true },
    });
    const existingByKey = new Map(existingRows.map((row) => [locationKey(row.title, row.type, row.childOf), row]));
    const idsByInputId = new Map<string, string>();
    const pendingRows: Array<LocationRow & { postalCode: null; status: string }> = [];
    const existingIds: string[] = [];

    for (const inputRow of inputRows) {
      const resolvedParentId = inputRow.childOf ? idsByInputId.get(inputRow.childOf) : null;
      const key = locationKey(inputRow.title, inputRow.type, resolvedParentId ?? null);
      const existing = existingByKey.get(key);
      if (existing) {
        idsByInputId.set(inputRow.id, existing.id);
        existingIds.push(existing.id);
        continue;
      }

      const id = randomUUID();
      idsByInputId.set(inputRow.id, id);
      pendingRows.push({ ...inputRow, id, childOf: resolvedParentId ?? null, postalCode: null, status: 'active' });
      existingByKey.set(key, { ...inputRow, id });
    }

    if (existingIds.length) {
      await transaction.location.updateMany({ where: { id: { in: existingIds } }, data: { status: 'active' } });
    }
    if (pendingRows.length) {
      await transaction.location.createMany({ data: pendingRows });
    }
    return inputRows.length;
  }, { timeout: 30000 });
}

// Creates a stable lookup key from a location and its parent.
function locationKey(title: string, type: string, childOf: string | null): string {
  return JSON.stringify([title, type, childOf]);
}

// Runs the location import and closes the database connection afterward.
async function main(): Promise<void> {
  try {
    const processedCount = await importLocations();
    console.log(`Processed ${processedCount} Nepal location records.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('Location import failed:', error);
  process.exitCode = 1;
});
