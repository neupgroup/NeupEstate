import type { CreatePropertyFormValues, CreatePropertyInput, Property, StructuredLocation } from '@/types';
import { getIdentity } from '@/services/neupid/get-identity';

// Returns the verified accountId on success, or throws with a structured error
// that callers can surface directly to the UI.
export async function requireIdentity(): Promise<string> {
  const identity = await getIdentity();
  if (!identity.authenticated) {
    throw Object.assign(new Error('Authentication required. Please sign in and try again.'), {
      code: 'UNAUTHENTICATED',
      reason: identity.reason,
    });
  }
  return identity.account.accountId;
}

export const formatLocationString = (structuredLocation?: StructuredLocation): string => {
  if (!structuredLocation) return '';
  const parts = [
    structuredLocation.street,
    structuredLocation.ward ? `Ward ${structuredLocation.ward}` : '',
    structuredLocation.municipality,
    structuredLocation.district,
    structuredLocation.province,
    structuredLocation.country,
  ];
  return parts.filter(Boolean).join(', ');
};

export function firstPositivePrice(pricing?: CreatePropertyFormValues['pricing']): number {
  const direct = Number(pricing?.listed ?? 0);
  if (direct > 0) return direct;

  const prices = Object.values(pricing?.basisPrices ?? {})
    .map((value) => Number(value ?? 0))
    .filter((value) => value > 0);

  return prices[0] ?? 0;
}

export function cleanPricing(pricing?: CreatePropertyFormValues['pricing']) {
  if (!pricing) return undefined;

  const cleanNumberMap = (map?: Record<string, number | undefined>): Record<string, number> | undefined => {
    const entries = Object.entries(map ?? {})
      .map(([key, value]) => [key, Number(value ?? 0)] as const)
      .filter(([, value]) => value > 0);
    return entries.length ? Object.fromEntries(entries) : undefined;
  };
  const cleanStringMap = (map?: Record<string, string | undefined>): Record<string, string> | undefined => {
    const entries = Object.entries(map ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const basisPrices = cleanNumberMap(pricing.basisPrices);
  const basisNegotiablePrices = cleanNumberMap(pricing.basisNegotiablePrices);
  const activeBasis = new Set([
    ...Object.keys(basisPrices ?? {}),
    ...Object.keys(basisNegotiablePrices ?? {}),
  ]);
  const basisNegotiable = Object.fromEntries(
    Object.entries(pricing.basisNegotiable ?? {}).filter(([basis, value]) => value && activeBasis.has(basis)),
  );

  return {
    ...pricing,
    listed: pricing.listed && pricing.listed > 0 ? pricing.listed : undefined,
    basisPrices,
    basisNegotiable: Object.keys(basisNegotiable).length ? basisNegotiable : undefined,
    basisNegotiablePrices,
    basisFrequencies: cleanStringMap(pricing.basisFrequencies),
    basisUnits: cleanStringMap(pricing.basisUnits),
    options: Array.isArray(pricing.options) ? pricing.options : pricing.options?.split(',').map(o => o.trim()).filter(Boolean) as any,
  };
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function deepMergeJson<T>(base: T, patch: any): T {
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
      ? deepMergeJson(current, value)
      : value;
  }

  return merged as T;
}

export function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}

export function normalizeOwnerEntries(value: unknown): NonNullable<CreatePropertyInput['owners']> {
  return normalizeArrayLikeValue(value)
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      ownerClientId: typeof entry.ownerClientId === 'string' ? entry.ownerClientId.trim() : '',
      isPrimaryOwner: Boolean(entry.isPrimaryOwner),
      clientName: typeof entry.clientName === 'string' ? entry.clientName : undefined,
      clientEmail: typeof entry.clientEmail === 'string' ? entry.clientEmail : undefined,
      clientPhone: typeof entry.clientPhone === 'string' ? entry.clientPhone : undefined,
    }))
    .filter((entry) => entry.ownerClientId.length > 0) as NonNullable<CreatePropertyInput['owners']>;
}

export function normalizeOwnerReferenceEntries(value: unknown): Array<{ id: string; isprimary: boolean }> {
  const rawEntries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? [value]
      : [];

  return rawEntries
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const id = typeof entry.id === 'string'
        ? entry.id.trim()
        : typeof entry.ownerClientId === 'string'
          ? entry.ownerClientId.trim()
          : '';

      return {
        id,
        isprimary: Boolean(entry.isprimary ?? entry.isPrimaryOwner),
      };
    })
    .filter((entry) => entry.id.length > 0);
}

export function normalizePropertyChangeData(data: Record<string, any>): Record<string, any> {
  const next = { ...data };
  for (const key of ['images', 'documents', 'plots', 'apartmentUnits']) {
    if (key in next) next[key] = normalizeArrayLikeValue(next[key]);
  }
  if ('owner' in next) {
    next.owner = normalizeOwnerReferenceEntries(next.owner);
  }
  if ('owners' in next) {
    next.owners = normalizeOwnerEntries(next.owners);
  }
  if ('listingAgentAccountId' in next) {
    next.listingAgentAccountId = typeof next.listingAgentAccountId === 'string'
      ? next.listingAgentAccountId.trim()
      : '';
  }
  if ('listingAgent' in next) {
    next.listingAgent = typeof next.listingAgent === 'string'
      ? next.listingAgent.trim()
      : '';
  }
  return next;
}

export function mapPropertyToCreateFormValues(property: Property): Partial<CreatePropertyFormValues> {
  return {
    title: property.title,
    description: property.description,
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
    carParkingSpots: property.carParkingSpots,
    bikeParkingSpots: property.bikeParkingSpots,
    area: property.area ? { sqft: property.area } : undefined,
    areaUnit: property.areaUnit,
    facing: property.facing,
    buildStart: property.buildStart,
    buildCompleted: property.buildCompleted,
    purpose: property.purpose,
    purposes: property.purposes?.length ? property.purposes : [property.purpose],
    categories: property.category ? [property.category] : [],
    types: property.type ? [property.type] : [],
    amenities: Array.isArray(property.amenities) ? property.amenities.join(', ') : '',
    images: Array.isArray(property.images) ? property.images : [],
    listingAgent: property.listingAgent || '',
    listingAgentAccountId: property.listingAgentId || '',
    isOwnerListing: property.isOwnerListing || false,
    floors: property.floors ?? undefined,
    onFloor: property.onFloor ?? undefined,
    roadAccess: property.roadAccess ?? undefined,
    landDetails: property.landDetails ? {
      ...property.landDetails,
      area: property.landDetails.area != null
        ? (typeof property.landDetails.area === 'number'
          ? { sqft: property.landDetails.area }
          : property.landDetails.area)
        : undefined,
    } : {},
    plots: (property.plots ?? []).map((plot: any) => ({
      ...plot,
      area: plot.area != null
        ? (typeof plot.area === 'number' ? { sqft: plot.area } : plot.area)
        : undefined,
    })),
    apartmentDetails: property.apartmentDetails || {},
    apartmentUnits: (property.apartmentUnits ?? []).map((unit: any) => ({
      ...unit,
      area: unit.area != null
        ? (typeof unit.area === 'number' ? { sqft: unit.area } : unit.area)
        : undefined,
    })),
    structuredLocation: property.structuredLocation || {},
    pricing: property.pricing ? {
      ...property.pricing,
      options: Array.isArray(property.pricing.options) ? property.pricing.options.join(', ') : '',
    } : { listed: property.price, currency: 'USD', priceDisplayMode: 'show-price', negotiable: false },
    roadAccessDetails: property.roadAccessDetails || undefined,
    distancing: property.distancing || undefined,
    earnings: property.earnings || undefined,
    owners: property.owners || [],
    documents: property.documents || [],
  };
}
