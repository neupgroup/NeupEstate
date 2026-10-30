import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client';

type Municipality = { name: string; type: string };
type LocationData = Record<string, Record<string, Municipality[]>>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function titleCase(value: string): string {
  return value.split(/[-_\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function normalizeType(type: string): string {
  return type.replaceAll('_', '');
}

async function importLocations(): Promise<void> {
  const filePath = path.join(process.cwd(), 'locations.json');
  const source = JSON.parse(await readFile(filePath, 'utf8')) as LocationData;

  await prisma.$transaction(async (transaction) => {
    const countryId = randomUUID();
    await transaction.location.upsert({
      where: { id: countryId },
      update: {},
      create: { id: countryId, title: 'Nepal', type: 'country', status: 'active' },
    });

    const existingNepal = await transaction.location.findFirst({
      where: { title: 'Nepal', type: 'country' },
    });
    const nepalId = existingNepal?.id ?? countryId;

    for (const [provinceName, districts] of Object.entries(source)) {
      const provinceTitle = titleCase(provinceName);
      const province = await transaction.location.upsert({
        where: { id: await getStableLocationId(transaction, provinceTitle, 'province', nepalId) },
        update: { title: provinceTitle, status: 'active' },
        create: { id: randomUUID(), title: provinceTitle, type: 'province', childOf: nepalId, status: 'active' },
      });

      for (const [districtName, municipalities] of Object.entries(districts)) {
        const districtTitle = titleCase(districtName);
        const district = await upsertByNaturalKey(transaction, districtTitle, 'area', province.id);
        for (const municipality of municipalities) {
          await upsertByNaturalKey(transaction, municipality.name, normalizeType(municipality.type), district.id);
        }
      }
    }
  });
}

async function getStableLocationId(
  transaction: PrismaClient,
  title: string,
  type: string,
  parentId: string,
): Promise<string> {
  const location = await transaction.location.findFirst({ where: { title, type, childOf: parentId } });
  return location?.id ?? randomUUID();
}

async function upsertByNaturalKey(
  transaction: PrismaClient,
  title: string,
  type: string,
  childOf: string,
): Promise<{ id: string }> {
  const existing = await transaction.location.findFirst({ where: { title, type, childOf } });
  if (existing) {
    return transaction.location.update({
      where: { id: existing.id },
      data: { status: 'active' },
      select: { id: true },
    });
  }
  return transaction.location.create({
    data: { id: randomUUID(), title, type, childOf, status: 'active' },
    select: { id: true },
  });
}

importLocations()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
