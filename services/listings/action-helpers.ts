import type { CreateListingFormValues, CreateListingInput, Listing, ListingPriceBasis, StructuredLocation } from '@/types';
import { getIdentity } from '@/services/neupid/get-identity';

// Returns the verified accountId on success, or throws with a structured error
// that callers can surface directly to the UI.
/**
 * requireIdentity handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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



/**
 * firstPositivePrice handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function firstPositivePrice(pricing?: CreateListingFormValues['pricing']): number {
  return getListingPriceFields(pricing).priceAmount ?? 0;
}

const PRICE_AREA_SQUARE_METERS: Record<string, number> = {
  sqm: 1, 'sq m': 1, 'square meter': 1, 'square meters': 1, 'm²': 1,
  sqft: 0.09290304, 'sq ft': 0.09290304, 'square feet': 0.09290304,
  sqyd: 0.83612736, 'sq yd': 0.83612736, 'square yard': 0.83612736,
  aana: 31.797, ana: 31.797, ropani: 508.752, paisa: 7.94925, daam: 1.9873125,
  bigha: 2508.38208, kattha: 313.54776, dhur: 15.677388, acre: 4046.8564224, hectare: 10000,
};

type ListingPricingInput = {
  currency?: string | null;
  listed?: number;
  basis?: NonNullable<CreateListingFormValues['pricing']>['basis'];
  basisPrices?: Record<string, number | undefined>;
  basisFrequencies?: Record<string, string | undefined>;
  basisUnits?: Record<string, string | undefined>;
};

type ListingPriceFields = { priceBasis: ListingPriceBasis | null; priceCurrency: string | null; priceAmount: number | null };

// Normalize the selected form price into the canonical listing basis and square-meter amount.
export function getListingPriceFields(pricing?: ListingPricingInput, fallbackPrice?: number): ListingPriceFields {
  const populatedBases = Object.entries(pricing?.basisPrices ?? {})
    .filter(([, value]) => Number(value ?? 0) > 0);
  const preferredNonRental = populatedBases.find(([basis]) => !/rent|lease/i.test(basis));
  const selectedBasis = populatedBases.length > 1 && preferredNonRental
    ? preferredNonRental[0] as NonNullable<CreateListingFormValues['pricing']>['basis']
    : pricing?.basis ?? populatedBases[0]?.[0] as NonNullable<CreateListingFormValues['pricing']>['basis'] | undefined;
  const rawAmount = Number((selectedBasis ? pricing?.basisPrices?.[selectedBasis] : undefined) ?? pricing?.listed ?? fallbackPrice ?? 0);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return { priceBasis: null, priceCurrency: pricing?.currency ?? null, priceAmount: null };
  }

  const normalizedBasis = (selectedBasis ?? '').toLowerCase();
  const selectedUnit = selectedBasis ? pricing?.basisUnits?.[selectedBasis] : undefined;
  const normalizedUnit = selectedUnit?.trim().toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ');
  const areaInSquareMeters = normalizedUnit ? PRICE_AREA_SQUARE_METERS[normalizedUnit] : undefined;
  const hasUnitBasis = normalizedBasis.includes('unit') || normalizedBasis.includes('per-aana') || normalizedBasis.includes('per-ropani') || normalizedBasis.includes('per-sqft');
  const frequency = selectedBasis ? pricing?.basisFrequencies?.[selectedBasis]?.trim().toLowerCase() : undefined;
  const isPerUnit = hasUnitBasis || Boolean(areaInSquareMeters);
  const isMonthly = frequency
    ? ['monthly', 'quarterly', 'half-yearly', 'half yearly'].includes(frequency)
    : normalizedBasis.includes('per-month') || normalizedBasis.includes('monthly') || normalizedBasis.includes('rent');
  const isYearly = frequency
    ? ['yearly', 'annual'].includes(frequency)
    : normalizedBasis.includes('per-annum') || normalizedBasis.includes('annual') || normalizedBasis.includes('yearly');

  let priceBasis: ListingPriceBasis = 'total';
  if (isPerUnit && isMonthly) priceBasis = 'perUnitPerMonth';
  else if (isPerUnit && isYearly) priceBasis = 'perUnitPerYear';
  else if (isPerUnit) priceBasis = 'perUnit';
  else if (isMonthly) priceBasis = 'perMonth';
  else if (isYearly) priceBasis = 'perYear';

  let priceAmount = isPerUnit && areaInSquareMeters ? rawAmount / areaInSquareMeters : rawAmount;
  if (frequency === 'quarterly') priceAmount /= 3;
  if (frequency === 'half-yearly' || frequency === 'half yearly') priceAmount /= 6;
  return { priceBasis, priceCurrency: pricing?.currency ?? 'NPR', priceAmount };
}

// Convert canonical listing prices back to the selected form unit for editing.
export function getListingFormPricing(property: Listing): CreateListingFormValues['pricing'] {
  const pricing = { ...(property.pricing ?? {}) } as NonNullable<CreateListingFormValues['pricing']>;
  const canonicalAmount = Number(property.price.amount ?? 0);
  pricing.currency = property.price.currency as NonNullable<typeof pricing.currency>;

  if (canonicalAmount > 0 && property.price.basis) {
    const isLand = property.category === 'Land';
    const isApartment = ['Apartment', 'Penthouse', 'Flat'].includes(property.category);
    const isHouse = ['House', 'Bungalow', 'Villa', 'Multiplex'].includes(property.category);
    const isRental = property.purpose === 'Rent' || property.purpose === 'Lease';
    const isPerUnit = property.price.basis === 'perUnit' || property.price.basis === 'perUnitPerMonth' || property.price.basis === 'perUnitPerYear';
    const isMonthly = property.price.basis === 'perMonth' || property.price.basis === 'perUnitPerMonth';
    const isYearly = property.price.basis === 'perYear' || property.price.basis === 'perUnitPerYear';
    const defaultBasis = isLand
      ? isPerUnit ? (isRental ? 'land-rent-unit' : 'land-sale-unit') : isRental ? 'land-rent-flat' : 'land-sale-flat'
      : isApartment
        ? isRental ? 'apartment-rent' : 'apartment-sale-flat'
        : isHouse
          ? isRental ? 'house-rent' : 'house-sale-flat'
          : isMonthly ? 'per-month' : isYearly ? 'per-annum' : 'flat-price';
    const originalBasis = pricing.basis;
    const originalUnit = originalBasis ? pricing.basisUnits?.[originalBasis] : undefined;
    const basis = defaultBasis;
    pricing.basis = basis as NonNullable<typeof pricing.basis>;
    if (isPerUnit) {
      pricing.basisUnits = { ...(pricing.basisUnits ?? {}), [basis]: originalUnit ?? pricing.basisUnits?.[basis] ?? 'Sqm' };
    }
    if (isMonthly) {
      pricing.basisFrequencies = { ...(pricing.basisFrequencies ?? {}), [basis]: 'Monthly' };
    }
    if (isYearly) {
      pricing.basisFrequencies = { ...(pricing.basisFrequencies ?? {}), [basis]: 'Yearly' };
    }
    if (basis) {
      const unit = pricing.basisUnits?.[basis]?.trim().toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ');
      const areaInSquareMeters = unit ? PRICE_AREA_SQUARE_METERS[unit] : undefined;
      const formAmount = property.price.basis === 'perUnit' || property.price.basis === 'perUnitPerMonth' || property.price.basis === 'perUnitPerYear'
        ? canonicalAmount * (areaInSquareMeters ?? 1)
        : canonicalAmount;
      pricing.basisPrices = { ...(pricing.basisPrices ?? {}), [basis]: formAmount };
    } else {
      pricing.listed = canonicalAmount;
    }
  }

  return pricing;
}

// Keep display settings and negotiation metadata in JSON while storing primary prices in listing columns.
export function cleanPricingMetadata(pricing: unknown): Record<string, unknown> | null {
  if (!isPlainObject(pricing)) return null;
  const {
    listed: _listed, basis: _basis, basisPrices: _basisPrices,
    basisNegotiable: _basisNegotiable, basisNegotiablePrices: _basisNegotiablePrices,
    basisFrequencies: _basisFrequencies, basisUnits: _basisUnits, currency: _currency,
    ...metadata
  } = pricing;
  return metadata;
}



/**
 * cleanPricing handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function cleanPricing(pricing?: CreateListingFormValues['pricing']) {
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



/**
 * isPlainObject handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function isPlainObject(value: unknown): value is Record<string, any> {
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



/**
 * normalizeArrayLikeValue handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}



/**
 * normalizeOwnerEntries handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function normalizeOwnerEntries(value: unknown): NonNullable<CreateListingInput['owners']> {
  return normalizeArrayLikeValue(value)
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      ownerClientId: typeof entry.ownerClientId === 'string' ? entry.ownerClientId.trim() : '',
      isPrimaryOwner: Boolean(entry.isPrimaryOwner),
      clientName: typeof entry.clientName === 'string' ? entry.clientName : undefined,
      clientEmail: typeof entry.clientEmail === 'string' ? entry.clientEmail : undefined,
      clientPhone: typeof entry.clientPhone === 'string' ? entry.clientPhone : undefined,
    }))
    .filter((entry) => entry.ownerClientId.length > 0) as NonNullable<CreateListingInput['owners']>;
}



/**
 * normalizeOwnerReferenceEntries handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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



/**
 * normalizePropertyChangeData handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function normalizeListingChangeData(data: Record<string, any>): Record<string, any> {
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



/**
 * mapPropertyToCreateFormValues handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export function mapListingToCreateFormValues(property: Listing): Partial<CreateListingFormValues> {
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
    area: property.area ? { sqm: property.area } : undefined,
    facing: property.facing,
    buildStart: property.buildStart,
    buildCompleted: property.buildCompleted,
    purpose: property.purpose,
    category: property.category,
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
          ? { sqm: property.landDetails.area }
          : property.landDetails.area)
        : undefined,
    } : {},
    plots: (property.plots ?? []).map((plot: any) => ({
      ...plot,
      area: plot.area != null
        ? (typeof plot.area === 'number' ? { sqm: plot.area } : plot.area)
        : undefined,
    })),
    apartmentDetails: property.apartmentDetails || {},
    apartmentUnits: (property.apartmentUnits ?? []).map((unit: any) => ({
      ...unit,
      area: unit.area != null
        ? (typeof unit.area === 'number' ? { sqm: unit.area } : unit.area)
        : undefined,
    })),
    structuredLocation: property.structuredLocation || {},
    pricing: {
      currency: 'NPR',
      priceDisplayMode: 'show-price',
      negotiable: false,
      ...getListingFormPricing(property),
      options: Array.isArray(property.pricing?.options) ? property.pricing.options.join(', ') : '',
    },
    roadAccessDetails: property.roadAccessDetails || undefined,
    distancing: property.distancing || undefined,
    earnings: property.earnings || undefined,
    owners: property.owners || [],
    documents: property.documents || [],
  };
}
