/*
::neup.documentation::property-service-shared

Shared mapping, include, and normalization helpers for property service modules.

::end
*/

import { prisma } from '@/core/database/prisma';
import type { Property } from '@/types';
import { mapPurposeFromEnum, mapTypeFromEnum } from '@/inapp/database/adapters';

export interface SavedPropertyEntry {
  userId: string;
  userName: string;
  propertyId: string;
  propertyTitle: string;
  savedAt: string;
}

export interface PropertyDraftSummary {
  id: string;
  propertyId?: string | null;
  title: string;
  location?: string;
  category?: string;
  status: 'creation_draft' | 'creation_pending' | 'changing' | 'deleting';
  modifiedOn: string;
}

export interface AwaitingReviewItem {
  id: string;
  title: string;
  location?: string;
  category?: string;
  kind: 'property' | 'draft';
  propertyId?: string;
  status?: string;
  modifiedOn?: string;
}

export function normalizePropertyChangeStatus(status: string | null | undefined): PropertyDraftSummary['status'] | string {
  if (status === 'creating') return 'creation_draft';
  return status || 'creation_draft';
}

export type BridgePropertyField = string;

export interface BridgePropertyQuery {
  agencyId?: string;
  agentId?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

export interface BridgePropertyResult {
  properties: Array<Partial<Property> & Record<string, unknown>>;
  totalCount: number;
  limit: number;
  offset: number;
}

export const PROPERTY_TYPE = {
  HOUSE: 'HOUSE',
  APARTMENT: 'APARTMENT',
  LAND: 'LAND',
  COMMERCIAL: 'COMMERCIAL',
} as const;

export type PropertyTypeValue = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];

export const PROPERTY_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  AWAITING_CREATION: 'AWAITING_CREATION',
} as const;

export const PROPERTY_INCLUDE = {
  media:           { where: { isDeleted: false }, orderBy: { sortOrder: 'asc' as const } },
  houseDetail:     true,
  apartmentDetail: true,
  landDetail:      true,
  commercialDetail: true,
  prices:          true,
  owners:          {
    include: {
      ownerClient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          contact: true,
          contacts: true,
        },
      },
    },
    orderBy: [{ isPrimaryOwner: 'desc' as const }, { id: 'asc' as const }],
  },
  documents:       true,
};

export const BRIDGE_PROPERTY_FIELDS = [
  'id',
  'title',
  'description',
  'price',
  'location',
  'bedrooms',
  'bathrooms',
  'area',
  'areaUnit',
  'facing',
  'buildStart',
  'buildCompleted',
  'purpose',
  'purposes',
  'category',
  'type',
  'images',
  'amenities',
  'agency',
  'listingAgent',
  'isOwnerListing',
  'isFeatured',
  'isApproved',
  'status',
  'createdAt',
  'updatedAt',
  'floors',
  'onFloor',
  'roadAccess',
  'kitchens',
  'diningRooms',
  'livingRooms',
  'carParkingSpots',
  'bikeParkingSpots',
  'slug',
  'landDetails',
  'plots',
  'apartmentDetails',
  'apartmentUnits',
  'structuredLocation',
  'details',
  'pricing',
  'roadAccessDetails',
  'distancing',
  'earnings',
  'documents',
] as const satisfies readonly BridgePropertyField[];

export const DEFAULT_BRIDGE_PROPERTY_FIELDS = [
  ...BRIDGE_PROPERTY_FIELDS,
] as const satisfies readonly BridgePropertyField[];

export const BRIDGE_PROPERTY_DEFAULT_LIMIT = 10;
export const BRIDGE_PROPERTY_MAX_LIMIT = 15;

export function resolveBridgePropertyFields(fields?: string[]): BridgePropertyField[] {
  if (!fields?.length) return [...DEFAULT_BRIDGE_PROPERTY_FIELDS];

  return fields
    .map((field) => field.trim())
    .filter(Boolean)
    .filter((field, index, list) => list.indexOf(field) === index);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function setNestedValue(target: Record<string, unknown>, path: string[], value: unknown) {
  let cursor = target;

  for (const [index, segment] of path.entries()) {
    if (!segment) return;
    if (index === path.length - 1) {
      cursor[segment] = value;
      return;
    }

    const next = cursor[segment];
    if (!isRecord(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
}

function normalizeBridgeFieldPath(field: BridgePropertyField): string[] {
  const path = field.split('.').map((part) => part.trim()).filter(Boolean);
  return path[0] === 'property' ? path.slice(1) : path;
}

function getSpecificsValue(property: Property, path: string[]): unknown {
  if (path.length === 0) {
    return {
      rooms: getSpecificsValue(property, ['rooms']),
      space: getSpecificsValue(property, ['space']),
    };
  }

  const [segment, ...rest] = path;
  const groups: Record<string, Record<string, unknown>> = {
    rooms: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      kitchens: property.kitchens,
      diningRooms: property.diningRooms,
      livingRooms: property.livingRooms,
      attachedBathrooms: property.attachedBathrooms,
      homeOffices: property.homeOffices,
      libraries: property.libraries,
      studyRooms: property.studyRooms,
      meetingRooms: property.meetingRooms,
      guestRooms: property.guestRooms,
      workersCabins: property.workersCabins,
      poojaRooms: property.poojaRooms,
      storeRooms: property.storeRooms,
    },
    space: {
      area: property.area,
      areaUnit: property.areaUnit,
      floors: property.floors,
      onFloor: property.onFloor,
      roadAccess: property.roadAccess,
      facing: property.facing,
      carParkingSpots: property.carParkingSpots,
      bikeParkingSpots: property.bikeParkingSpots,
    },
  };

  const value = groups[segment];
  if (!value) return undefined;
  if (rest.length === 0) return value;
  return rest.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

function getPropertyDetailsValue(property: Property): Record<string, unknown> {
  return {
    landDetails: property.landDetails,
    plots: property.plots,
    apartmentDetails: property.apartmentDetails,
    apartmentUnits: property.apartmentUnits,
    details: property.details,
    roadAccessDetails: property.roadAccessDetails,
    distancing: property.distancing,
    earnings: property.earnings,
    specifics: {
      rooms: getSpecificsValue(property, ['rooms']),
      space: {
        area: property.area,
        areaUnit: property.areaUnit,
      },
    },
  };
}

function getPropertySpacingValue(property: Property): Record<string, unknown> {
  return {
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floors: property.floors,
    onFloor: property.onFloor,
    kitchens: property.kitchens,
    diningRooms: property.diningRooms,
    livingRooms: property.livingRooms,
    carParkingSpots: property.carParkingSpots,
    bikeParkingSpots: property.bikeParkingSpots,
  };
}

function getBridgePropertyFieldValue(property: Property, path: string[]): unknown {
  const [root, ...rest] = path;
  if (!root) return undefined;

  if (root === 'specifics') return getSpecificsValue(property, rest);
  if (root === 'details' && rest.length === 0) return getPropertyDetailsValue(property);
  if (root === 'spacing' && rest.length === 0) return getPropertySpacingValue(property);

  if (root === 'pricing' && property.pricing) {
    const publicPricing = { ...(property.pricing as Record<string, unknown>) };
    delete publicPricing.negotiable;
    delete publicPricing.basisNegotiable;
    delete publicPricing.basisNegotiablePrices;
    return rest.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), publicPricing);
  }

  if (root === 'structuredLocation' && property.structuredLocation) {
    const publicLocation = { ...(property.structuredLocation as Record<string, unknown>) };
    delete publicLocation.coordinates;
    return rest.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), publicLocation);
  }

  const value = (property as unknown as Record<string, unknown>)[root];
  if (rest.length === 0) return value;
  return rest.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

export function pickPropertyFields(property: Property, fields: BridgePropertyField[]): Partial<Property> & Record<string, unknown> {
  return fields.reduce<Partial<Property> & Record<string, unknown>>((picked, field) => {
    const path = normalizeBridgeFieldPath(field);
    const value = getBridgePropertyFieldValue(property, path);

    if (value !== undefined) {
      setNestedValue(picked, path, value);
    }

    return picked;
  }, {});
}

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

export function mapRecord(record: any): Property {
  const purpose  = mapPurposeFromEnum(record.purpose) as Property['purpose'];
  const category = mapTypeFromEnum(record.type)       as Property['category'];

  const mediaImages: string[] = (record.media ?? []).map((m: any) => m.url).filter(Boolean);
  const images = mediaImages;

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

  if (record.type === PROPERTY_TYPE.HOUSE && house) {
    bedrooms = house.bedrooms; bathrooms = house.bathrooms;
    floors = house.floors; kitchens = house.kitchens;
    livingRooms = house.livingRooms; diningRooms = house.diningRooms;
    carParkingSpots = house.carParkingSpots; bikeParkingSpots = house.bikeParkingSpots;
    area = Number(house.area); facing = house.facing || undefined;
    roadAccess = Number(house.roadAccess) || undefined;
  } else if (record.type === PROPERTY_TYPE.APARTMENT && apartment) {
    bedrooms = apartment.bedrooms; bathrooms = apartment.bathrooms;
    onFloor = apartment.onFloor; floors = apartment.totalFloors;
    carParkingSpots = apartment.carParkingSpots; bikeParkingSpots = apartment.bikeParkingSpots;
    area = Number(apartment.superArea);
  } else if (record.type === PROPERTY_TYPE.LAND && land) {
    area = Number(land.area); facing = land.facing || undefined;
    roadAccess = Number(land.roadAccess) || undefined;
  } else if (record.type === PROPERTY_TYPE.COMMERCIAL && commercial) {
    floors = commercial.floor; area = Number(commercial.usableArea);
  }

  const owners = record.owners?.length
    ? record.owners.map((o: any) => ({
        ownerClientId: o.ownerClientId,
        isPrimaryOwner: Boolean(o.isPrimaryOwner),
        clientName: [o.ownerClient?.firstName, o.ownerClient?.lastName].filter(Boolean).join(' ') || undefined,
        clientEmail: o.ownerClient?.contacts?.find((contact: any) => contact.type?.toLowerCase() === 'email')?.value || o.ownerClient?.contact?.email || undefined,
        clientPhone: o.ownerClient?.contacts?.find((contact: any) => contact.type?.toLowerCase() === 'phone')?.value || o.ownerClient?.contact?.phone || undefined,
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
    type:             record.type === PROPERTY_TYPE.COMMERCIAL ? 'Commercial' : 'Residential',
    images,
    amenities:        normalizeStringArray(record.amenities),
    agency:           { id: record.agency || 'unknown', name: record.agency || 'Owner', logoUrl: 'https://placehold.co/200x80.png' },
    listingAgent:     record.agent || undefined,
    listingAgentId:   record.agent || undefined,
    isOwnerListing:   !record.agency,
    isFeatured:       Boolean(record.isFeatured),
    isApproved:       Boolean(record.isApproved),
    status:           record.status as Property['status'],
    createdAt:        record.createdAt?.toISOString?.() || String(record.createdAt),
    updatedAt:        record.updatedAt?.toISOString?.() || String(record.updatedAt),
    floors, onFloor, roadAccess, latitude, longitude,
    kitchens, diningRooms, livingRooms,
    attachedBathrooms: typeof record.details?.attachedBathrooms === 'number' ? record.details.attachedBathrooms : undefined,
    homeOffices: typeof record.details?.homeOffices === 'number' ? record.details.homeOffices : undefined,
    libraries: typeof record.details?.libraries === 'number' ? record.details.libraries : undefined,
    studyRooms: typeof record.details?.studyRooms === 'number' ? record.details.studyRooms : undefined,
    meetingRooms: typeof record.details?.meetingRooms === 'number' ? record.details.meetingRooms : undefined,
    guestRooms: typeof record.details?.guestRooms === 'number' ? record.details.guestRooms : undefined,
    workersCabins: typeof record.details?.workersCabins === 'number' ? record.details.workersCabins : undefined,
    poojaRooms: typeof record.details?.poojaRooms === 'number' ? record.details.poojaRooms : undefined,
    storeRooms: typeof record.details?.storeRooms === 'number' ? record.details.storeRooms : undefined,
    carParkingSpots, bikeParkingSpots,
    metaTags:         normalizeStringArray(record.metaTags),
    landDetails:      record.landDetails || undefined,
    plots:            record.plots || undefined,
    apartmentDetails: record.apartmentDetails || undefined,
    structuredLocation: parseStructuredLocation(record.structuredLocation),
    pricing:          record.pricing || undefined,
    details:          record.details || undefined,
    roadAccessDetails: record.roadAccessDetails || undefined,
    distancing:       record.distancing || undefined,
    earnings:         record.earnings || undefined,
    owner:            owners?.[0],
    owners,
    documents,
  } as Property;
}

export async function hydratePropertyAccountLabels(properties: Property[]): Promise<Property[]> {
  const accountIds = Array.from(new Set(
    properties
      .flatMap((property) => [property.agency?.id, property.listingAgent])
      .filter((value): value is string => Boolean(value) && value !== 'unknown'),
  ));

  if (!accountIds.length) return properties;

  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, displayName: true },
  });
  const nameById = new Map(accounts.map((account) => [
    account.id,
    account.displayName?.trim() || account.id,
  ]));

  return properties.map((property) => ({
    ...property,
    agency: property.agency ? {
      ...property.agency,
      name: nameById.get(property.agency.id) || property.agency.name,
    } : property.agency,
    listingAgent: property.listingAgent
      ? (nameById.get(property.listingAgent) || property.listingAgent)
      : property.listingAgent,
  }));
}

export function onlyActive(p: Property) { return Boolean(p.isApproved); }
