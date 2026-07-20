'use server';

/*
::neup.documentation::property-service-update

Property create and mutation services that persist core property fields, details, media, and owners.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import type { CreatePropertyInput, ExtractedPropertyData, UpdatePropertyInput } from '@/types';
import { areaValueToSqft } from '@/types';
import { mapPurposeToEnum, mapStatusToEnum, mapTypeToEnum } from '@/inapp/database/adapters';
import slugify from 'slugify';
import { randomBytes } from 'crypto';
import { getPropertyById } from './view';
import { PROPERTY_TYPE, type PropertyTypeValue } from './shared';

function buildPropertyDetails(d: Partial<CreatePropertyInput> & Record<string, any>) {
  const baseDetails = isPlainObject(d.details) ? { ...d.details } : {};

  return {
    ...baseDetails,
    attachedBathrooms: typeof d.attachedBathrooms === 'number'
      ? d.attachedBathrooms
      : typeof baseDetails.attachedBathrooms === 'number'
        ? baseDetails.attachedBathrooms
        : 0,
    homeOffices: typeof d.homeOffices === 'number'
      ? d.homeOffices
      : typeof baseDetails.homeOffices === 'number'
        ? baseDetails.homeOffices
        : 0,
    libraries: typeof d.libraries === 'number'
      ? d.libraries
      : typeof baseDetails.libraries === 'number'
        ? baseDetails.libraries
        : 0,
    studyRooms: typeof d.studyRooms === 'number'
      ? d.studyRooms
      : typeof baseDetails.studyRooms === 'number'
        ? baseDetails.studyRooms
        : 0,
    meetingRooms: typeof d.meetingRooms === 'number'
      ? d.meetingRooms
      : typeof baseDetails.meetingRooms === 'number'
        ? baseDetails.meetingRooms
        : 0,
    guestRooms: typeof d.guestRooms === 'number'
      ? d.guestRooms
      : typeof baseDetails.guestRooms === 'number'
        ? baseDetails.guestRooms
        : 0,
    workersCabins: typeof d.workersCabins === 'number'
      ? d.workersCabins
      : typeof baseDetails.workersCabins === 'number'
        ? baseDetails.workersCabins
        : 0,
    poojaRooms: typeof d.poojaRooms === 'number'
      ? d.poojaRooms
      : typeof baseDetails.poojaRooms === 'number'
        ? baseDetails.poojaRooms
        : 0,
    storeRooms: typeof d.storeRooms === 'number'
      ? d.storeRooms
      : typeof baseDetails.storeRooms === 'number'
        ? baseDetails.storeRooms
        : 0,
  };
}

function buildCoreData(d: Partial<CreatePropertyInput> & Record<string, any>) {
  const geo = (d.latitude != null && d.longitude != null) ? `${d.latitude},${d.longitude}` : '';
  const truncate = (s: string | undefined | null, max: number) =>
    s ? s.substring(0, max) : '';
  return {
    slug:              d.slug ? d.slug.substring(0, 120) : undefined,
    title:             truncate(d.title, 255),
    description:       d.description ?? '',
    coverImage:        truncate(Array.isArray(d.images) && d.images[0] ? d.images[0] : '', 255),
    type:              mapTypeToEnum(d.category),
    purpose:           mapPurposeToEnum(d.purpose),
    status:            mapStatusToEnum(d.status),
    currency:          truncate(d.pricing?.currency ?? 'NPR', 10),
    displayPrice:      d.price ?? 0,
    displayPriceUnit:  truncate(d.pricing?.basis ?? '', 24),
    areaUnit:          truncate(d.areaUnit ?? '', 64),
    locationText:      truncate(d.location ?? '', 255),
    geoLocation:       truncate(geo, 63),
    structuredLocation: d.structuredLocation ? JSON.stringify(d.structuredLocation) : '',
    agency:            d.agency ?? null,
    agent:             d.agent ?? null,
    isFeatured:        d.isFeatured ?? false,
    isApproved:        d.isApproved ?? false,
    amenities:         Array.isArray(d.amenities) ? d.amenities : [],
    metaTags:          Array.isArray(d.metaTags) ? d.metaTags : [],
    pricing:           d.pricing ?? null,
    details:           buildPropertyDetails(d),
    roadAccessDetails: d.roadAccessDetails ?? null,
    distancing:        d.distancing ?? null,
    earnings:          d.earnings ?? null,
    landDetails:       d.landDetails ?? null,
    plots:             d.plots ?? null,
    apartmentDetails:  d.apartmentDetails ?? null,
    customId:          d.customId ?? null,
  };
}

/*
::neup.documentation::property-write-slug-generation

::private

Generates a non-empty property slug for write operations before the initial
insert. Prisma requires `property.slug` at create time, so both manual and
import-based creation paths first use a title slug and then fall back to
`title` plus a 12-character mixed-case alphanumeric suffix to reduce collision
risk.

::private end
::end
*/
function buildPropertySlug(input: { slug?: string | null; title?: string | null }, withSuffix = false): string {
  const explicitSlug = typeof input.slug === 'string' ? input.slug.trim() : '';
  if (explicitSlug) {
    return explicitSlug.substring(0, 120);
  }

  const baseSlug = slugify(input.title ?? 'property', { lower: true, strict: true, trim: true }) || 'property';
  if (!withSuffix) {
    return baseSlug.substring(0, 120);
  }

  const suffix = randomBytes(18)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 12);
  const joined = `${baseSlug}-${suffix || 'propertysuffix'}`;
  return joined.substring(0, 120);
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

async function createPropertyRecordWithGeneratedSlug(data: Record<string, any>) {
  const primarySlug = buildPropertySlug(data);

  try {
    return await prisma.property.create({
      data: { ...data, slug: primarySlug } as any,
    });
  } catch (error) {
    const fallbackSlug = buildPropertySlug(data, true);
    if (isUniqueConstraintError(error)) {
      return prisma.property.create({
        data: { ...data, slug: fallbackSlug } as any,
      });
    }
    throw error;
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function deepMergePropertyData<T>(base: T, patch: any): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }

  const merged: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) {
      delete merged[key];
      continue;
    }

    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value)
      ? deepMergePropertyData(current, value)
      : value;
  }

  return merged as T;
}

function normalizePropertyAgency(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (isPlainObject(value) && typeof value.id === 'string') {
    return value.id !== 'unknown' ? value.id : null;
  }
  return undefined;
}

function normalizePropertyAgent(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() || null;
  return undefined;
}

async function resolveMergedPropertyData(id: string, patch: Partial<CreatePropertyInput> & Record<string, any>) {
  const [current, currentRecord] = await Promise.all([
    getPropertyById(id, { includeInactive: true }),
    prisma.property.findUnique({ where: { id }, select: { agency: true } }),
  ]);

  if (!current || !currentRecord) {
    throw new Error('Property not found.');
  }

  const merged = deepMergePropertyData(current as Record<string, any>, patch) as Partial<CreatePropertyInput> & Record<string, any>;

  // `getPropertyById()` returns a display object for `agency`; Prisma expects the scalar FK value.
  merged.agency = normalizePropertyAgency(patch.agency) ?? currentRecord.agency;
  if ('listingAgentAccountId' in patch) {
    merged.agent = normalizePropertyAgent(patch.listingAgentAccountId);
  }
  if (patch.owner !== undefined && patch.owners === undefined) {
    merged.owners = normalizePropertyOwners(patch.owner);
  }
  delete (merged as Record<string, any>).owner;

  return merged;
}

async function upsertDetailTable(propertyId: string, type: PropertyTypeValue, d: any) {
  const area = areaValueToSqft(d.area);
  if (type === PROPERTY_TYPE.HOUSE) {
    await prisma.propertyHouseDetail.upsert({
      where: { propertyId },
      create: { propertyId, bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, furnished: false, buildYear: 0, area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
      update: { bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
    });
  } else if (type === PROPERTY_TYPE.APARTMENT) {
    await prisma.propertyApartmentDetail.upsert({
      where: { propertyId },
      create: { propertyId, bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, onFloor: d.onFloor ?? 0, totalFloors: d.floors ?? 0, balconies: 0, lifts: 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, furnished: false, blockName: '', unitNumber: '', superArea: area, builtUpArea: area, maintenanceFee: 0 },
      update: { bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, onFloor: d.onFloor ?? 0, totalFloors: d.floors ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, superArea: area, builtUpArea: area },
    });
  } else if (type === PROPERTY_TYPE.LAND) {
    await prisma.propertyLandDetail.upsert({
      where: { propertyId },
      create: { propertyId, area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0, plotShape: '', cornerPlot: false, waterAvailable: false, electricityAvailable: false, boundaryWall: false },
      update: { area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
    });
  } else if (type === PROPERTY_TYPE.COMMERCIAL) {
    await prisma.propertyCommercialDetail.upsert({
      where: { propertyId },
      create: { propertyId, floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, frontage: 0, usableArea: area, buildingType: '' },
      update: { floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, usableArea: area },
    });
  }
}

function normalizePropertyImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
  }

  if (typeof images === 'string') {
    return images
      .split(',')
      .map((image) => image.trim())
      .filter(Boolean);
  }

  if (images && typeof images === 'object') {
    return Object.values(images as Record<string, unknown>)
      .flatMap((value) => normalizePropertyImages(value))
      .filter((image, index, self) => self.indexOf(image) === index);
  }

  return [];
}

function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}

function normalizePropertyOwners(owners: unknown): NonNullable<CreatePropertyInput['owners']> {
  const rawEntries = Array.isArray(owners)
    ? owners
    : owners && typeof owners === 'object'
      ? [owners]
      : [];

  return rawEntries
    .filter((owner): owner is Record<string, any> => Boolean(owner) && typeof owner === 'object' && !Array.isArray(owner))
    .map((owner) => ({
      ownerClientId: typeof owner.ownerClientId === 'string'
        ? owner.ownerClientId.trim()
        : typeof owner.id === 'string'
          ? owner.id.trim()
          : '',
      isPrimaryOwner: Boolean(owner.isPrimaryOwner ?? owner.isprimary),
      clientName: typeof owner.clientName === 'string' ? owner.clientName : undefined,
      clientEmail: typeof owner.clientEmail === 'string' ? owner.clientEmail : undefined,
      clientPhone: typeof owner.clientPhone === 'string' ? owner.clientPhone : undefined,
    }))
    .filter((owner) => owner.ownerClientId.length > 0) as NonNullable<CreatePropertyInput['owners']>;
}

async function upsertMedia(propertyId: string, images: unknown) {
  const normalizedImages = normalizePropertyImages(images);
  await prisma.propertyMedia.deleteMany({ where: { propertyId } });
  if (normalizedImages.length > 0) {
    await prisma.propertyMedia.createMany({
      data: normalizedImages.map((url, i) => ({ propertyId, url, type: 'photo', alt: '', sortOrder: i, isPrimary: i === 0 })),
    });
  }
}

async function replacePropertyOwners(propertyId: string, owners: CreatePropertyInput['owners'] = []) {
  const normalizedOwners = normalizePropertyOwners(owners);
  await prisma.propertyOwner.deleteMany({ where: { propertyId } });
  if (!normalizedOwners.length) return;

  await prisma.propertyOwner.createMany({
    data: normalizedOwners.map((owner, index) => ({
      propertyId,
      ownerClientId: owner.ownerClientId,
      isPrimaryOwner: owner.isPrimaryOwner ?? index === 0,
    })),
  });
}

export async function createProperty(d: CreatePropertyInput & { creatorId?: string }): Promise<string> {
  try {
    const coreData = buildCoreData({ ...d, status: 'approved', isApproved: true });
    const created = await createPropertyRecordWithGeneratedSlug(coreData);
    if (!created.slug) await prisma.property.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, d);
    await upsertMedia(created.id, d.images ?? []);

    await replacePropertyOwners(created.id, d.owners);

    return created.id;
  } catch (e) { await logProblem(e, 'createProperty'); throw new Error('Failed to create property.'); }
}

export async function addProperty(d: Omit<ExtractedPropertyData, 'embedding'>): Promise<string> {
  try {
    const { isPropertyPage: _, ...rest } = d as any;
    const coreData = buildCoreData({ ...rest, status: 'pending', isApproved: false });
    const created = await createPropertyRecordWithGeneratedSlug(coreData);
    if (!created.slug) await prisma.property.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, rest);
    await upsertMedia(created.id, rest.images ?? []);
    return created.id;
  } catch (e) { await logProblem(e, 'addProperty'); throw new Error('Failed to add property.'); }
}

export async function updateProperty(id: string, d: UpdatePropertyInput): Promise<void> {
  try {
    const merged = await resolveMergedPropertyData(id, d as Partial<CreatePropertyInput> & Record<string, any>);
    const coreData = buildCoreData(merged);
    await prisma.property.update({ where: { id }, data: coreData as any });
    await upsertDetailTable(id, mapTypeToEnum((merged as any).category ?? merged.categories?.[0]), merged);
    if (merged.images !== undefined) await upsertMedia(id, merged.images ?? []);
    await replacePropertyOwners(id, merged.owners);
  } catch (e) { await logProblem(e, `updateProperty ${id}`); throw new Error('Failed to update property.'); }
}

export async function updatePropertyWithExtractedData(id: string, d: ExtractedPropertyData): Promise<void> {
  const { isPropertyPage: _, ...rest } = d as any;
  return updateProperty(id, rest);
}

export async function updatePropertyImages(id: string, images: string[]): Promise<void> {
  try {
    await upsertMedia(id, images);
    await prisma.property.update({
      where: { id },
      data: { coverImage: normalizePropertyImages(images)[0] ?? '' },
    });
  } catch (e) { await logProblem(e, `updatePropertyImages ${id}`); throw new Error('Failed to update images.'); }
}
