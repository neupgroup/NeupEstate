'use server';

/*
::neup.documentation::property-service-update

Property create and mutation services that persist core property fields, details, media, and owners.

::end
*/

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { CreateListingInput, ExtractedListingData, UpdateListingInput } from '@/types';
import { areaValueToSqm } from '@/types';
import { mapPurposeToEnum, mapStatusToEnum, mapTypeToEnum } from '@/inapp/database/adapters';
import { cleanPricingMetadata, getListingPriceFields } from '@/services/listings/action-helpers';
import slugify from 'slugify';
import { getListingById } from '../listings/view';
import { PROPERTY_TYPE, type ListingTypeValue } from './shared';



/**
 * buildPropertyDetails handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function buildListingDetails(d: Partial<CreateListingInput> & Record<string, any>) {
  const baseDetails = isPlainObject(d.details) ? { ...d.details } : {};

  return {
    ...baseDetails,
    ...(d.pricing ? { pricing: cleanPricingMetadata(d.pricing) } : {}),
    ...(isPlainObject(d.structuredLocation) ? { structuredLocation: d.structuredLocation } : {}),
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

// Require a real location UUID before writing a listing record.
function resolveLocationId(data: Partial<CreateListingInput> & Record<string, any>): string {
  const locationId = data.locationId ?? data.location;
  if (typeof locationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(locationId)) {
    throw new Error('Select a valid location from the location list.');
  }
  return locationId;
}



/**
 * buildCoreData handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function buildCoreData(d: Partial<CreateListingInput> & Record<string, any>) {
  const geo = (d.latitude != null && d.longitude != null) ? `${d.latitude},${d.longitude}` : '';
  const listingPrice = getListingPriceFields(d.pricing, d.price);
  const truncate = (s: string | undefined | null, max: number) =>
    s ? s.substring(0, max) : '';
  return {
    slug:              d.slug ? d.slug.substring(0, 120) : undefined,
    title:             truncate(d.title, 255),
    description:       d.description ?? '',
    media:             normalizeListingMedia(d.images),
    type:              mapTypeToEnum(d.category),
    purpose:           mapPurposeToEnum(d.purpose),
    status:            mapStatusToEnum(d.status),
    currency:          truncate(listingPrice.priceCurrency ?? d.pricing?.currency ?? 'NPR', 10),
    priceBasis:        listingPrice.priceBasis,
    priceCurrency:    listingPrice.priceCurrency,
    priceListed:      listingPrice.priceAmount,
    priceNegotiable:  typeof d.pricing?.negotiable === 'boolean' ? d.pricing.negotiable : null,
    location:          resolveLocationId(d),
    geoLocation:       truncate(geo, 63),
    isFeatured:        d.isFeatured ?? false,
    isApproved:        d.isApproved ?? false,
    amenities:         Array.isArray(d.amenities) ? d.amenities : [],
    metaTags:          Array.isArray(d.metaTags) ? d.metaTags : [],
    details:           buildListingDetails(d),
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

Generates a non-empty display slug for write operations before the initial
insert. Slugs may repeat; public URLs pair the slug with the property ID.

::private end
::end
*/
/**
 * buildPropertySlug handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function buildListingSlug(input: { slug?: string | null; title?: string | null }): string {
  const explicitSlug = typeof input.slug === 'string' ? input.slug.trim() : '';
  if (explicitSlug) {
    return explicitSlug.substring(0, 120);
  }

  const baseSlug = slugify(input.title ?? 'property', { lower: true, strict: true, trim: true }) || 'property';
  return baseSlug.substring(0, 120);
}



/**
 * createPropertyRecordWithGeneratedSlug handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function createListingRecordWithGeneratedSlug(data: Record<string, any>) {
  const slug = buildListingSlug(data);
  return prisma.listing.create({ data: { ...data, slug } as any });
}



/**
 * isPlainObject handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function deepMergeListingData<T>(base: T, patch: any): T {
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
      ? deepMergeListingData(current, value)
      : value;
  }

  return merged as T;
}



/**
 * normalizePropertyAgency handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function normalizeListingAgency(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (isPlainObject(value) && typeof value.id === 'string') {
    return value.id !== 'unknown' ? value.id : null;
  }
  return undefined;
}



/**
 * normalizePropertyAgent handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function normalizeListingAgent(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() || null;
  return undefined;
}



/**
 * resolveMergedListingData handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function resolveMergedListingData(id: string, patch: Partial<CreateListingInput> & Record<string, any>) {
  const current = await getListingById(id, { includeInactive: true });

  if (!current) {
    throw new Error('Property not found.');
  }

  const merged = deepMergeListingData(current as Record<string, any>, patch) as Partial<CreateListingInput> & Record<string, any>;

  const currentAgencyId = current.agency?.id && current.agency.id !== 'unknown' ? current.agency.id : null;
  merged.agency = patch.agency !== undefined ? normalizeListingAgency(patch.agency) : currentAgencyId;
  if ('listingOwner' in patch) {
    merged.listingOwner = normalizeListingAgent(patch.listingOwner);
  } else if ('listingAgentAccountId' in patch) {
    merged.listingOwner = normalizeListingAgent(patch.listingAgentAccountId);
  } else {
    merged.listingOwner = current.listingAgentId ?? null;
  }
  if (patch.owner !== undefined && patch.owners === undefined) {
    merged.owners = normalizeListingOwners(patch.owner);
  }
  delete (merged as Record<string, any>).owner;

  return merged;
}



/**
 * upsertDetailTable handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function upsertDetailTable(propertyId: string, type: ListingTypeValue, d: any) {
  const area = areaValueToSqm(d.area);
  if (type === PROPERTY_TYPE.HOUSE) {
    await prisma.listingHouse.upsert({
      where: { listingId: propertyId },
      create: { listingId: propertyId, bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, furnished: false, buildYear: 0, area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
      update: { bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, area, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
    });
  } else if (type === PROPERTY_TYPE.APARTMENT) {
    await prisma.listingApartment.upsert({
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
    await prisma.listingCommercial.upsert({
      where: { propertyId },
      create: { propertyId, floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, frontage: 0, usableArea: area, buildingType: '' },
      update: { floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, usableArea: area },
    });
  }
}



/**
 * normalizePropertyImages handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function normalizeListingImages(images: unknown): string[] {
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
      .flatMap((value) => normalizeListingImages(value))
      .filter((image, index, self) => self.indexOf(image) === index);
  }

  return [];
}

// Convert form image URLs to the JSON shape stored on listings.media.
function normalizeListingMedia(images: unknown): Array<{ type: string; url: string; alt: string }> {
  return normalizeListingImages(images).map((url) => ({ type: 'image', url, alt: '' }));
}



/**
 * normalizeArrayLikeValue handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}



/**
 * normalizePropertyOwners handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
function normalizeListingOwners(owners: unknown): NonNullable<CreateListingInput['owners']> {
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
    .filter((owner) => owner.ownerClientId.length > 0) as NonNullable<CreateListingInput['owners']>;
}



/**
 * upsertMedia handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function upsertMedia(propertyId: string, images: unknown) {
  await prisma.listing.update({ where: { id: propertyId }, data: { media: normalizeListingMedia(images) } });
}



/**
 * replacePropertyOwners handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function replaceListingOwners(propertyId: string, owners: CreateListingInput['owners'] = []) {
  const normalizedOwners = normalizeListingOwners(owners);
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

async function replaceListingRepresentatives(propertyId: string, agencyId?: string | null, listingOwnerId?: string | null) {
  const representativeIds = [...new Set([agencyId, listingOwnerId].filter((id): id is string => Boolean(id?.trim())).map((id) => id.trim()))];
  await prisma.listingRepresentative.deleteMany({ where: { propertyId, role: 'listingOwner' } });
  if (!representativeIds.length) return;
  await prisma.listingRepresentative.createMany({
    data: representativeIds.map((representativeId) => ({
      propertyId,
      representativeId,
      role: 'listingOwner',
      status: null,
    })),
  });
}



/**
 * createProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function createListingRecord(d: CreateListingInput & { creatorId?: string }): Promise<string> {
  try {
    const coreData = buildCoreData({ ...d, status: 'approved', isApproved: true });
    const created = await createListingRecordWithGeneratedSlug(coreData);
    await replaceListingRepresentatives(created.id, d.agency, d.listingOwner ?? d.agent);
    if (!created.slug) await prisma.listing.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, d);
    await upsertMedia(created.id, d.images ?? []);

    await replaceListingOwners(created.id, d.owners);

    return created.id;
  } catch (e) { await logger().type('createPropertyRecord').data({ error: String(e), details: {} }).log(); throw new Error('Failed to create property.'); }
}



/**
 * addProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function addListing(d: Omit<ExtractedListingData, 'embedding'>): Promise<string> {
  try {
    const { isListingPage: _, ...rest } = d as any;
    const coreData = buildCoreData({ ...rest, status: 'pending', isApproved: false });
    const created = await createListingRecordWithGeneratedSlug(coreData);
    await replaceListingRepresentatives(created.id, rest.agency, rest.listingOwner ?? rest.agent);
    if (!created.slug) await prisma.listing.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, rest);
    await upsertMedia(created.id, rest.images ?? []);
    return created.id;
  } catch (e) { await logger().type('addProperty').data({ error: String(e), details: {} }).log(); throw new Error('Failed to add property.'); }
}



/**
 * updateProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function updateListing(id: string, d: UpdateListingInput): Promise<void> {
  try {
    const merged = await resolveMergedListingData(id, d as Partial<CreateListingInput> & Record<string, any>);
    const coreData = buildCoreData(merged);
    await prisma.listing.update({ where: { id }, data: coreData as any });
    await replaceListingRepresentatives(id, merged.agency, merged.listingOwner);
    await upsertDetailTable(id, mapTypeToEnum(merged.category), merged);
    if (merged.images !== undefined) await upsertMedia(id, merged.images ?? []);
    await replaceListingOwners(id, merged.owners);
  } catch (e) { await logger().type(`updateProperty ${id}`).data({ error: String(e), details: {} }).log(); throw new Error('Failed to update property.'); }
}



/**
 * updatePropertyWithExtractedData handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function updateListingWithExtractedData(id: string, d: ExtractedListingData): Promise<void> {
  const { isListingPage: _, ...rest } = d as any;
  return updateListing(id, rest);
}



/**
 * updatePropertyImages handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function updateListingImages(id: string, images: string[]): Promise<void> {
  try {
    await upsertMedia(id, images);
  } catch (e) { await logger().type(`updatePropertyImages ${id}`).data({ error: String(e), details: {} }).log(); throw new Error('Failed to update images.'); }
}
