'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData, UpdatePropertyInput } from '@/types';
import { PropertyType, PropertyStatus, PropertyPurpose } from '@prisma/client';
import { mapPurposeToEnum, mapPurposeFromEnum, mapTypeToEnum, mapTypeFromEnum, mapStatusToEnum, mapStatusFromEnum } from '@/lib/adapters/enum-mappers';

export interface SavedPropertyEntry {
  userId: string;
  userName: string;
  propertyId: string;
  propertyTitle: string;
  savedAt: string;
}

const PROPERTY_INCLUDE = {
  media:           { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' as const } },
  houseDetail:     true,
  apartmentDetail: true,
  landDetail:      true,
  commercialDetail: true,
  prices:          true,
  owners:          true,
  documents:       true,
} as const;

function parseGeoLocation(geo: string | null): { latitude?: number; longitude?: number } {
  if (!geo) return {};
  const [lat, lng] = geo.split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) return {};
  return { latitude: lat, longitude: lng };
}

function parseStructuredLocation(raw: string | null): any {
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function mapRecord(record: any): Property {
  const purpose  = mapPurposeFromEnum(record.purpose) as Property['purpose'];
  const category = mapTypeFromEnum(record.type)       as Property['category'];

  const mediaImages: string[] = (record.media ?? []).map((m: any) => m.url).filter(Boolean);
  const images = mediaImages.length > 0 ? mediaImages : (record.coverImage ? [record.coverImage] : []);

  const firstPrice = record.prices?.[0];
  const price = firstPrice ? Number(firstPrice.price) : Number(record.displayPrice ?? 0);

  const { latitude, longitude } = parseGeoLocation(record.geoLocation);

  const house      = record.houseDetail;
  const apartment  = record.apartmentDetail;
  const land       = record.landDetail;
  const commercial = record.commercialDetail;

  let bedrooms = 0, bathrooms = 0, area = 0;
  let floors: number | undefined, onFloor: number | undefined;
  let kitchens: number | undefined, livingRooms: number | undefined;
  let diningRooms: number | undefined, carParkingSpots: number | undefined;
  let bikeParkingSpots: number | undefined, roadAccess: number | undefined;
  let facing: string | undefined;

  if (record.type === PropertyType.HOUSE && house) {
    bedrooms = house.bedrooms; bathrooms = house.bathrooms;
    floors = house.floors; kitchens = house.kitchens;
    livingRooms = house.livingRooms; diningRooms = house.diningRooms;
    carParkingSpots = house.carParkingSpots; bikeParkingSpots = house.bikeParkingSpots;
    area = Number(house.area); facing = house.facing || undefined;
    roadAccess = Number(house.roadAccess) || undefined;
  } else if (record.type === PropertyType.APARTMENT && apartment) {
    bedrooms = apartment.bedrooms; bathrooms = apartment.bathrooms;
    onFloor = apartment.onFloor; floors = apartment.totalFloors;
    carParkingSpots = apartment.carParkingSpots; bikeParkingSpots = apartment.bikeParkingSpots;
    area = Number(apartment.superArea);
  } else if (record.type === PropertyType.LAND && land) {
    area = Number(land.area); facing = land.facing || undefined;
    roadAccess = Number(land.roadAccess) || undefined;
  } else if (record.type === PropertyType.COMMERCIAL && commercial) {
    floors = commercial.floor; area = Number(commercial.usableArea);
  }

  const owners = record.owners?.length
    ? record.owners.map((o: any) => ({
        ownerType: o.ownerType,
        userId: o.userId || undefined,
        unregisteredOwnerName: o.unregisteredName || undefined,
        unregisteredOwnerEmail: o.unregisteredEmail || undefined,
        unregisteredOwnerPhones: o.unregisteredPhones || undefined,
        unregisteredOwnerNotes: o.unregisteredNotes || undefined,
      }))
    : undefined;

  const documents = record.documents?.length
    ? record.documents.map((d: any) => ({ name: d.name, urls: d.urls }))
    : undefined;

  return {
    id:               record.id,
    slug:             record.slug || record.id,
    title:            record.title || 'Untitled Property',
    description:      record.description || '',
    price,
    location:         record.locationText || 'Nepal',
    bedrooms,
    bathrooms,
    area,
    areaUnit:         record.areaUnit || undefined,
    facing,
    purpose,
    purposes:         [purpose],
    category,
    type:             record.type === PropertyType.COMMERCIAL ? 'Commercial' : 'Residential',
    images,
    amenities:        normalizeStringArray(record.amenities),
    agency:           { id: record.agency || 'unknown', name: 'Agency', logoUrl: 'https://placehold.co/200x80.png' },
    listingAgent:     record.agent || undefined,
    isFeatured:       Boolean(record.isFeatured),
    isApproved:       Boolean(record.isApproved),
    createdAt:        record.createdAt?.toISOString?.() || String(record.createdAt),
    updatedAt:        record.updatedAt?.toISOString?.() || String(record.updatedAt),
    floors, onFloor, roadAccess, latitude, longitude,
    kitchens, diningRooms, livingRooms, carParkingSpots, bikeParkingSpots,
    metaTags:         normalizeStringArray(record.metaTags),
    landDetails:      record.landDetails || undefined,
    plots:            record.plots || undefined,
    apartmentDetails: record.apartmentDetails || undefined,
    structuredLocation: parseStructuredLocation(record.structuredLocation),
    pricing:          record.pricing || undefined,
    roadAccessDetails: record.roadAccessDetails || undefined,
    distancing:       record.distancing || undefined,
    earnings:         record.earnings || undefined,
    owners,
    documents,
  } as Property;
}

function onlyActive(p: Property) { return Boolean(p.isApproved); }

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getProperties(opts: { includeInactive?: boolean } = {}): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ orderBy: { updatedAt: 'desc' }, include: PROPERTY_INCLUDE });
    const all = records.map(mapRecord);
    return opts.includeInactive ? all : all.filter(onlyActive);
  } catch (e) { await logProblem(e, 'getProperties'); return []; }
}

export async function getPaginatedProperties(opts: { page?: number; limit?: number; filters?: PropertyFilters; includeInactive?: boolean; ownerAccountId?: string } = {}): Promise<{ properties: Property[]; totalCount: number }> {
  try {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const filters = opts.filters ?? {};
    const where: any = {};

    if (!opts.includeInactive) where.status = PropertyStatus.ACTIVE;
    if (filters.id) where.id = filters.id;
    if (filters.status) where.status = mapStatusToEnum(filters.status);
    if (filters.sourceUrl) where.fetchHistory = { some: { sourceUrl: filters.sourceUrl } };
    if (filters.searchTerm) where.OR = [
      { title: { contains: filters.searchTerm, mode: 'insensitive' } },
      { description: { contains: filters.searchTerm, mode: 'insensitive' } },
    ];
    if (Number.isFinite(filters.minPrice)) where.displayPrice = { ...where.displayPrice, gte: filters.minPrice };
    if (Number.isFinite(filters.maxPrice)) where.displayPrice = { ...where.displayPrice, lte: filters.maxPrice };
    if (opts.ownerAccountId) where.owners = { some: { userId: opts.ownerAccountId } };

    const [totalCount, records] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, skip: (page - 1) * limit, include: PROPERTY_INCLUDE }),
    ]);
    return { properties: records.map(mapRecord), totalCount };
  } catch (e) { await logProblem(e, 'getPaginatedProperties'); return { properties: [], totalCount: 0 }; }
}

export async function getPropertyById(id: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const record = await prisma.property.findUnique({ where: { id }, include: PROPERTY_INCLUDE });
    if (!record) return null;
    const p = mapRecord(record);
    return opts.includeInactive ? p : (p.isApproved ? p : null);
  } catch (e) { await logProblem(e, `getPropertyById ${id}`); return null; }
}

export async function getPropertyBySlug(slug: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const record = await prisma.property.findFirst({ where: { slug }, include: PROPERTY_INCLUDE });
    if (record) {
      const p = mapRecord(record);
      return opts.includeInactive ? p : (p.isApproved ? p : null);
    }
    return getPropertyById(slug, opts);
  } catch (e) { await logProblem(e, `getPropertyBySlug ${slug}`); return null; }
}

export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { isFeatured: true, status: PropertyStatus.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    if (records.length > 0) return records.map(mapRecord);
    const fallback = await prisma.property.findMany({ where: { status: PropertyStatus.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return fallback.map(mapRecord);
  } catch (e) { await logProblem(e, 'getFeaturedProperties'); return []; }
}

export async function getRecentProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { status: PropertyStatus.ACTIVE }, orderBy: { createdAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getRecentProperties'); return []; }
}

export async function getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { purpose: mapPurposeToEnum(purpose), status: PropertyStatus.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getPropertiesByPurpose'); return []; }
}

export async function getFeaturedProjects(limit = 4): Promise<Property[]> {
  return getFeaturedProperties(limit);
}

export async function getPremiumProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { status: PropertyStatus.ACTIVE, displayPrice: { gt: 0 } }, orderBy: { displayPrice: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getPremiumProperties'); return []; }
}

export async function getLuxuriousProperties(limit = 4): Promise<Property[]> {
  return getPremiumProperties(limit);
}

export async function getPendingProperties(limit = 50): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { status: PropertyStatus.PENDING }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getPendingProperties'); return []; }
}

export async function getPropertiesByAgent(agentId: string, opts: { includeInactive?: boolean } = {}): Promise<Property[]> {
  try {
    const where: any = { agent: agentId };
    if (!opts.includeInactive) where.status = PropertyStatus.ACTIVE;
    const records = await prisma.property.findMany({ where, orderBy: { updatedAt: 'desc' }, include: PROPERTY_INCLUDE });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, `getPropertiesByAgent ${agentId}`); return []; }
}

// ─── Write ───────────────────────────────────────────────────────────────────

function buildCoreData(d: Partial<CreatePropertyInput> & Record<string, any>) {
  const geo = (d.latitude != null && d.longitude != null) ? `${d.latitude},${d.longitude}` : '';
  return {
    slug:              d.slug || undefined,
    title:             d.title ?? '',
    description:       d.description ?? '',
    coverImage:        Array.isArray(d.images) && d.images[0] ? d.images[0] : '',
    type:              mapTypeToEnum(d.category),
    purpose:           mapPurposeToEnum(d.purpose),
    status:            mapStatusToEnum(d.status),
    currency:          d.pricing?.currency ?? 'NPR',
    displayPrice:      d.price ?? 0,
    displayPriceUnit:  d.pricing?.basis ?? '',
    areaUnit:          d.areaUnit ?? '',
    locationText:      d.location ?? '',
    geoLocation:       geo,
    structuredLocation: d.structuredLocation ? JSON.stringify(d.structuredLocation) : '',
    agency:            typeof d.agency === 'object' ? d.agency?.id : (d.agency ?? null),
    agent:             d.listingAgent ?? null,
    isFeatured:        d.isFeatured ?? false,
    isApproved:        d.isApproved ?? false,
    amenities:         Array.isArray(d.amenities) ? d.amenities : [],
    metaTags:          Array.isArray(d.metaTags) ? d.metaTags : [],
    pricing:           d.pricing ?? null,
    roadAccessDetails: d.roadAccessDetails ?? null,
    distancing:        d.distancing ?? null,
    earnings:          d.earnings ?? null,
    landDetails:       d.landDetails ?? null,
    plots:             d.plots ?? null,
    apartmentDetails:  d.apartmentDetails ?? null,
    customId:          d.customId ?? null,
  };
}

async function upsertDetailTable(propertyId: string, type: PropertyType, d: any) {
  if (type === PropertyType.HOUSE) {
    await prisma.propertyHouseDetail.upsert({
      where: { propertyId },
      create: { propertyId, bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, furnished: false, buildYear: 0, area: d.area ?? 0, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
      update: { bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, floors: d.floors ?? 0, kitchens: d.kitchens ?? 0, livingRooms: d.livingRooms ?? 0, diningRooms: d.diningRooms ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, area: d.area ?? 0, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
    });
  } else if (type === PropertyType.APARTMENT) {
    await prisma.propertyApartmentDetail.upsert({
      where: { propertyId },
      create: { propertyId, bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, onFloor: d.onFloor ?? 0, totalFloors: d.floors ?? 0, balconies: 0, lifts: 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, furnished: false, blockName: '', unitNumber: '', superArea: d.area ?? 0, builtUpArea: d.area ?? 0, maintenanceFee: 0 },
      update: { bedrooms: d.bedrooms ?? 0, bathrooms: d.bathrooms ?? 0, onFloor: d.onFloor ?? 0, totalFloors: d.floors ?? 0, carParkingSpots: d.carParkingSpots ?? 0, bikeParkingSpots: d.bikeParkingSpots ?? 0, superArea: d.area ?? 0, builtUpArea: d.area ?? 0 },
    });
  } else if (type === PropertyType.LAND) {
    await prisma.propertyLandDetail.upsert({
      where: { propertyId },
      create: { propertyId, area: d.area ?? 0, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0, plotShape: '', cornerPlot: false, waterAvailable: false, electricityAvailable: false, boundaryWall: false },
      update: { area: d.area ?? 0, facing: d.facing ?? '', roadAccess: d.roadAccess ?? 0 },
    });
  } else if (type === PropertyType.COMMERCIAL) {
    await prisma.propertyCommercialDetail.upsert({
      where: { propertyId },
      create: { propertyId, floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, frontage: 0, usableArea: d.area ?? 0, buildingType: '' },
      update: { floor: d.floors ?? 0, washrooms: d.bathrooms ?? 0, parkingSpots: d.carParkingSpots ?? 0, usableArea: d.area ?? 0 },
    });
  }
}

async function upsertMedia(propertyId: string, images: string[]) {
  await prisma.propertyMedia.deleteMany({ where: { propertyId } });
  if (images.length > 0) {
    await prisma.propertyMedia.createMany({
      data: images.map((url, i) => ({ propertyId, url, type: 'photo', alt: '', sortOrder: i, isPrimary: i === 0 })),
    });
  }
}

export async function createProperty(d: CreatePropertyInput): Promise<string> {
  try {
    const coreData = buildCoreData({ ...d, status: 'approved', isApproved: true });
    const created = await prisma.property.create({
      data: { ...coreData, slug: coreData.slug || d.title?.toLowerCase().replace(/\s+/g, '-') || 'property' } as any,
    });
    if (!created.slug) await prisma.property.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, d);
    await upsertMedia(created.id, d.images ?? []);
    return created.id;
  } catch (e) { await logProblem(e, 'createProperty'); throw new Error('Failed to create property.'); }
}

export async function addProperty(d: Omit<ExtractedPropertyData, 'embedding'>): Promise<string> {
  try {
    const { isPropertyPage: _, ...rest } = d as any;
    const coreData = buildCoreData({ ...rest, status: 'pending', isApproved: false });
    const created = await prisma.property.create({ data: coreData as any });
    if (!created.slug) await prisma.property.update({ where: { id: created.id }, data: { slug: created.id } });
    await upsertDetailTable(created.id, created.type, rest);
    await upsertMedia(created.id, rest.images ?? []);
    if (rest.sourceUrl) {
      await prisma.propertyFetchHistory.create({ data: { propertyId: created.id, sourceUrl: rest.sourceUrl, type: 'data', data: rest } });
    }
    return created.id;
  } catch (e) { await logProblem(e, 'addProperty'); throw new Error('Failed to add property.'); }
}

export async function updateProperty(id: string, d: UpdatePropertyInput): Promise<void> {
  try {
    const coreData = buildCoreData(d);
    await prisma.property.update({ where: { id }, data: coreData as any });
    await upsertDetailTable(id, mapTypeToEnum((d as any).category ?? d.categories?.[0]), d);
    if (d.images) await upsertMedia(id, d.images);
  } catch (e) { await logProblem(e, `updateProperty ${id}`); throw new Error('Failed to update property.'); }
}

export async function updatePropertyWithExtractedData(id: string, d: ExtractedPropertyData): Promise<void> {
  const { isPropertyPage: _, ...rest } = d as any;
  return updateProperty(id, rest);
}

export async function updatePropertyImages(id: string, images: string[]): Promise<void> {
  try {
    await upsertMedia(id, images);
    if (images[0]) await prisma.property.update({ where: { id }, data: { coverImage: images[0] } });
  } catch (e) { await logProblem(e, `updatePropertyImages ${id}`); throw new Error('Failed to update images.'); }
}

export async function approveProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.update({ where: { id: propertyId }, data: { status: PropertyStatus.ACTIVE, isApproved: true } });
  } catch (e) { await logProblem(e, `approveProperty ${propertyId}`); throw new Error('Failed to approve property.'); }
}

export async function deleteProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.delete({ where: { id: propertyId } });
  } catch (e) { await logProblem(e, `deleteProperty ${propertyId}`); throw new Error('Failed to delete property.'); }
}

// ─── Fetch History ────────────────────────────────────────────────────────────

export async function addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void> {
  try {
    await prisma.propertyFetchHistory.create({ data: { propertyId, type: 'data', data: data as any } });
  } catch (e) { await logProblem(e, `addFetchToHistory ${propertyId}`); }
}

export async function deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
  try {
    await prisma.propertyFetchHistory.deleteMany({ where: { propertyId, fetchedAt: new Date(fetchedAt) } });
  } catch (e) { await logProblem(e, `deleteFetchHistoryItem ${propertyId}`); }
}

export async function addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
  try {
    await prisma.propertyFetchHistory.create({ data: { propertyId, type: 'images', images } });
  } catch (e) { await logProblem(e, `addImagesToFetchHistory ${propertyId}`); }
}

export async function deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
  try {
    await prisma.propertyFetchHistory.deleteMany({ where: { propertyId, fetchedAt: new Date(fetchedAt), type: 'images' } });
  } catch (e) { await logProblem(e, `deleteImageFetchHistoryItem ${propertyId}`); }
}

// ─── Saved Properties ─────────────────────────────────────────────────────────

export async function isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    return Boolean(existing);
  } catch (e) { await logProblem(e, 'isPropertySaved'); return false; }
}

export async function toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    if (existing) {
      await prisma.savedProperty.deleteMany({ where: { accountId: userId, propertyId } });
      return { saved: false };
    }
    await prisma.savedProperty.create({ data: { accountId: userId, propertyId } });
    return { saved: true };
  } catch (e) { await logProblem(e, 'toggleSavedProperty'); throw new Error('Failed to toggle saved property.'); }
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
  try {
    const saved = await prisma.savedProperty.findMany({ where: { accountId: userId }, include: { property: { include: PROPERTY_INCLUDE } }, orderBy: { savedAt: 'desc' } });
    return saved.map((e) => e.property).filter(Boolean).map(mapRecord).filter(onlyActive);
  } catch (e) { await logProblem(e, `getSavedProperties ${userId}`); return []; }
}

export async function getLatestSavedProperties(limit = 20): Promise<SavedPropertyEntry[]> {
  try {
    const saved = await prisma.savedProperty.findMany({ orderBy: { savedAt: 'desc' }, take: limit, include: { property: { include: PROPERTY_INCLUDE } } });
    return saved.map((e) => ({
      userId: e.accountId,
      userName: 'Unknown User',
      propertyId: e.propertyId,
      propertyTitle: e.property?.title || 'Unknown Property',
      savedAt: e.savedAt.toISOString(),
    }));
  } catch (e) { await logProblem(e, 'getLatestSavedProperties'); return []; }
}

export async function getUsersBySavedProperty(propertyId: string) {
  try {
    return await prisma.savedProperty.findMany({ where: { propertyId }, orderBy: { savedAt: 'desc' } });
  } catch (e) { await logProblem(e, `getUsersBySavedProperty ${propertyId}`); return []; }
}

// Alias kept for backward compatibility with actions.ts
export const getSavedPropertiesForUser = getSavedProperties;
