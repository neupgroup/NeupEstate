import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { areaValueToSqft, CreatePropertySchema, type CreatePropertyFormValues, type CreatePropertyInput, type LandDetails, type PlotDetails, type ApartmentUnit, type StructuredLocation } from '@/types';
import { getBridgePropertiesByAccount } from '@/services/property-service';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';

const PROPERTY_VIEW_INCLUDE = Prisma.validator<Prisma.PropertyInclude>()({
  media: { where: { isDeleted: false }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  houseDetail: true,
  apartmentDetail: true,
  landDetail: true,
  commercialDetail: true,
  prices: { orderBy: [{ for: 'asc' }, { id: 'asc' }] },
});

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOffset(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseFields(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((field) => field.trim()).filter(Boolean);
}

function readQueryValue(
  searchParams: URLSearchParams,
  primaryKey: string,
  fallbackKey?: string,
): string | undefined {
  const primaryValue = searchParams.get(primaryKey)?.trim() || undefined;
  const fallbackValue = fallbackKey ? searchParams.get(fallbackKey)?.trim() || undefined : undefined;

  if (primaryValue && fallbackValue && primaryValue !== fallbackValue) {
    throw new Error(`Provide only one of ${primaryKey} or ${fallbackKey}.`);
  }

  return primaryValue || fallbackValue;
}

function formatLocationString(structuredLocation?: StructuredLocation): string {
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
}

function firstPositivePrice(pricing?: CreatePropertyFormValues['pricing']): number {
  const direct = Number(pricing?.listed ?? 0);
  if (direct > 0) return direct;

  const prices = Object.values(pricing?.basisPrices ?? {})
    .map((value) => Number(value ?? 0))
    .filter((value) => value > 0);

  return prices[0] ?? 0;
}

function cleanPricing(pricing?: CreatePropertyFormValues['pricing']) {
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
    options: Array.isArray(pricing.options) ? pricing.options : pricing.options?.split(',').map((option) => option.trim()).filter(Boolean) as any,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function parseJsonRecord(value: unknown): Record<string, any> | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : undefined;
    } catch {
      return undefined;
    }
  }

  return typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'bigint') return Number(value);
  return undefined;
}

function toUpperToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const token = value.trim();
  return token ? token.replace(/[\s-]+/g, '_').toUpperCase() : undefined;
}

function mapVisibility(details: Record<string, any> | undefined): 'PUBLIC' | 'PRIVATE' {
  return details?.isPrivate ? 'PRIVATE' : 'PUBLIC';
}

function mapListingType(record: { agent?: string | null; agency?: string | null }): 'AGENT' | 'AGENCY' | 'OWNER' {
  if (record.agent) return 'AGENT';
  if (record.agency) return 'AGENCY';
  return 'OWNER';
}

function mapPricingType(value: unknown, fallback: string): string {
  return toUpperToken(value) || fallback;
}

function mapBasis(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

type PropertyViewPricingItem = {
  type: string;
  askingAmount: number;
  currency: string;
  basis?: string;
  unit?: string;
};

function buildPropertyPricing(record: any): PropertyViewPricingItem[] {
  const priceRows = Array.isArray(record.prices) ? record.prices : [];
  if (priceRows.length > 0) {
    return priceRows.map((priceRow: any) => ({
      type: mapPricingType(priceRow.for, toUpperToken(record.purpose) || 'SALE'),
      askingAmount: toNumber(priceRow.price) ?? 0,
      currency: priceRow.currency,
      basis: mapBasis(priceRow.priceUnit),
      unit: priceRow.unit,
    }));
  }

  const pricing = parseJsonRecord(record.pricing);
  if (!pricing) {
    return [{
      type: toUpperToken(record.purpose) || 'SALE',
      askingAmount: toNumber(record.displayPrice) ?? 0,
      currency: record.currency,
      basis: undefined,
      unit: record.areaUnit ?? undefined,
    }];
  }

  const basisPrices = pricing.basisPrices && typeof pricing.basisPrices === 'object' && !Array.isArray(pricing.basisPrices)
    ? pricing.basisPrices as Record<string, unknown>
    : undefined;

  const basisEntries: PropertyViewPricingItem[] = [];
  if (basisPrices) {
    for (const [basis, amount] of Object.entries(basisPrices)) {
      const askingAmount = toNumber(amount);
      if (!askingAmount || askingAmount <= 0) continue;
      basisEntries.push({
        type: toUpperToken(record.purpose) || 'SALE',
        askingAmount,
        currency: pricing.currency || record.currency,
        basis,
        unit: pricing.basisUnits?.[basis],
      });
    }
  }

  if (basisEntries.length > 0) return basisEntries;

  const listedAmount = toNumber(pricing.listed) ?? toNumber(record.displayPrice) ?? 0;
  return [{
    type: toUpperToken(record.purpose) || 'SALE',
    askingAmount: listedAmount,
    currency: pricing.currency || record.currency,
    basis: typeof pricing.basis === 'string' ? pricing.basis : undefined,
    unit: pricing.basis && pricing.basisUnits?.[pricing.basis]
      ? pricing.basisUnits[pricing.basis]
      : record.areaUnit ?? undefined,
  }];
}

async function mapPropertyViewPayload(record: any) {
  const accountIds = [record.agent, record.agency].filter((value): value is string => Boolean(value));
  const accounts = accountIds.length
    ? await prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, displayName: true, displayImage: true },
      })
    : [];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  const details = parseJsonRecord(record.details);
  const structuredLocation = parseJsonRecord(record.structuredLocation);
  const roadAccessDetails = parseJsonRecord(record.roadAccessDetails);
  const distancing = parseJsonRecord(record.distancing);

  const listedById = record.agent || record.agency || null;
  const listedByAccount = listedById ? accountMap.get(listedById) : undefined;

  return {
    id: record.id,
    customId: record.customId,
    slug: record.slug,
    keywords: normalizeStringArray(record.metaTags),
    tags: normalizeStringArray(record.metaTags),
    title: record.title,
    description: record.description,
    purpose: [String(record.purpose)],
    category: [String(record.type)],
    type: [record.type === 'COMMERCIAL' ? 'COMMERCIAL' : 'RESIDENTIAL'],
    status: String(record.status),
    visibility: mapVisibility(details),
    images: (record.media ?? []).map((media: any, index: number) => ({
      id: media.id,
      url: media.url,
      type: toUpperToken(media.type) || 'IMAGE',
      isCover: Boolean(media.isPrimary),
      order: typeof media.sortOrder === 'number' ? media.sortOrder : index + 1,
    })),
    listedBy: listedById ? {
      type: mapListingType(record),
      id: listedById,
      displayName: listedByAccount?.displayName || listedById,
      displayImage: listedByAccount?.displayImage || null,
    } : null,
    supportingAgents: [],
    location: {
      id: `property-location:${record.id}`,
      text: record.locationText,
      geo: record.geoLocation,
      structured: structuredLocation ?? null,
    },
    pricing: buildPropertyPricing(record),
    roadAccess: roadAccessDetails ? {
      roadWidth: toNumber(roadAccessDetails.widthValue) ?? null,
      roadWidthUnit: typeof roadAccessDetails.widthUnit === 'string' ? roadAccessDetails.widthUnit.toUpperCase() : null,
      roadType: toUpperToken(roadAccessDetails.type) ?? null,
    } : null,
    distance: distancing
      ? Object.fromEntries(
          Object.entries(distancing).filter(([key, value]) => key !== 'unit' && toNumber(value) !== undefined),
        )
      : {},
    amenities: normalizeStringArray(record.amenities),
    details: {
      house: record.houseDetail ? {
        bedrooms: record.houseDetail.bedrooms,
        bathrooms: record.houseDetail.bathrooms,
        livingRooms: record.houseDetail.livingRooms,
        diningRooms: record.houseDetail.diningRooms,
        kitchens: record.houseDetail.kitchens,
        floors: record.houseDetail.floors,
        carParkingSpots: record.houseDetail.carParkingSpots,
        bikeParkingSpots: record.houseDetail.bikeParkingSpots,
        builtYear: record.houseDetail.buildYear,
        furnished: record.houseDetail.furnished,
        details: [],
      } : null,
      apartment: record.apartmentDetail ? {
        bedrooms: record.apartmentDetail.bedrooms,
        bathrooms: record.apartmentDetail.bathrooms,
        onfloor: record.apartmentDetail.onFloor,
        builtYear: null,
        furnished: record.apartmentDetail.furnished,
        details: [],
      } : null,
      land: record.landDetail ? {
        area: toNumber(record.landDetail.area) ?? null,
        details: [],
      } : null,
      flat: null,
      space: record.commercialDetail ? {
        area: toNumber(record.commercialDetail.usableArea) ?? null,
        details: [],
      } : null,
    },
  };
}

function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}

function normalizeOwnerEntries(value: unknown): NonNullable<CreatePropertyInput['owners']> {
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

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeJson<T>(base: T, patch: any): T {
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

function normalizePropertyChangeData(data: Record<string, any>): Record<string, any> {
  const next = { ...data };
  for (const key of ['images', 'documents', 'plots', 'apartmentUnits']) {
    if (key in next) next[key] = normalizeArrayLikeValue(next[key]);
  }
  if ('owners' in next) {
    next.owners = normalizeOwnerEntries(next.owners);
  }
  if (next.pricing && typeof next.pricing === 'object' && !Array.isArray(next.pricing)) {
    const pricing = { ...next.pricing } as Record<string, any>;
    if (Array.isArray(pricing.options)) {
      pricing.options = pricing.options.filter((option) => typeof option === 'string' && option.trim().length > 0);
    }
    next.pricing = pricing;
  }
  return next;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPositiveNumber(value: unknown): boolean {
  return typeof value === 'number'
    ? Number.isFinite(value) && value > 0
    : typeof value === 'string'
      ? Number(value) > 0
      : false;
}

function hasAnyLocationValue(location: unknown): boolean {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return false;
  const candidate = location as Record<string, unknown>;
  return [
    candidate.country,
    candidate.province,
    candidate.district,
    candidate.municipality,
    candidate.ward,
    candidate.street,
    candidate.landmark,
    candidate.coordinates,
  ].some((value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    return isNonEmptyString(value);
  });
}

function hasPositivePriceInMap(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some((entry) => hasPositiveNumber(entry));
}

function hasAreaValue(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some((entry) => hasPositiveNumber(entry));
}

function hasNonEmptyStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => isNonEmptyString(entry));
}

function stripBridgeControlFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const {
    accountId: _accountId,
    postingAgencyId: _postingAgencyId,
    agencyId: _agencyId,
    requestId: _requestId,
    propertyId: _propertyId,
    property: _property,
    data: _data,
    ...rest
  } = value as Record<string, unknown>;

  return rest;
}

function getMissingPropertyCreateInfo(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['title', 'description', 'purpose', 'category', 'type', 'location', 'area', 'price', 'images'];
  }

  const data = payload as Record<string, unknown>;
  const missing = new Set<string>();

  if (!isNonEmptyString(data.title)) missing.add('title');
  if (!isNonEmptyString(data.description)) missing.add('description');
  if (!Array.isArray(data.purposes) || data.purposes.length === 0) missing.add('purpose');
  if (!Array.isArray(data.categories) || data.categories.length === 0) missing.add('category');
  if (!Array.isArray(data.types) || data.types.length === 0) missing.add('type');
  if (!hasAnyLocationValue(data.structuredLocation)) missing.add('location');
  if (!hasAreaValue(data.area)) missing.add('area');
  if (!hasNonEmptyStringArray(data.images)) missing.add('images');

  const pricing = data.pricing && typeof data.pricing === 'object' && !Array.isArray(data.pricing)
    ? data.pricing as Record<string, unknown>
    : undefined;
  const priceDisplayMode = typeof pricing?.priceDisplayMode === 'string' ? pricing.priceDisplayMode : 'show-price';

  if (priceDisplayMode === 'show-price') {
    const basis = typeof pricing?.basis === 'string' ? pricing.basis.trim() : '';
    const listedPricePresent = hasPositiveNumber(pricing?.listed);
    const basisPrices = pricing?.basisPrices && typeof pricing.basisPrices === 'object' && !Array.isArray(pricing.basisPrices)
      ? pricing.basisPrices as Record<string, unknown>
      : undefined;
    const basisSpecificPricePresent = basis ? hasPositiveNumber(basisPrices?.[basis]) : false;
    const anyBasisPricePresent = hasPositivePriceInMap(basisPrices);

    if (basis) {
      if (!basisSpecificPricePresent) {
        missing.add('price[basis]');
      }
    } else if (!listedPricePresent && !anyBasisPricePresent) {
      missing.add('price');
    }
  }

  return Array.from(missing);
}

/*
::neup.documentation::create-property-draft-request

::private

Creates or refreshes the current account's pending property creation request.

Property creation stays in `property_changes` until review approval. The
pending draft row keeps `property_id` nullable so no `property` record is
materialized before the creation request is accepted.

::private end

::end
*/
export async function createPropertyDraftRequest(input: {
  actorId: string;
  postingAgencyId?: string | null;
  workingProfileId?: string | null;
  data: CreatePropertyFormValues;
}): Promise<{ requestId: string }> {
  const validatedData = CreatePropertySchema.parse(input.data);
  const postingContext = await resolvePropertyPostingContext({
    actorAccountId: input.actorId,
    requestedWorkingProfileId: input.workingProfileId,
  });

  const orderedPurposes = validatedData.purposes?.length
    ? validatedData.purposes
    : validatedData.purpose
      ? [validatedData.purpose]
      : [];

  if (orderedPurposes.length === 0) {
    throw new Error('Please select at least one purpose.');
  }

  const priceDisplayMode = validatedData.pricing?.priceDisplayMode ?? 'show-price';
  const resolvedPrice = firstPositivePrice(validatedData.pricing);
  const pricing = cleanPricing(validatedData.pricing);

  if (priceDisplayMode === 'show-price' && resolvedPrice <= 0) {
    throw new Error('Show price requires at least one price.');
  }

  const locationString = formatLocationString(validatedData.structuredLocation);

  const serviceInput: CreatePropertyInput = {
    ...validatedData,
    purpose: orderedPurposes[0],
    purposes: orderedPurposes,
    location: locationString,
    price: resolvedPrice,
    details: {
      priceDisplayMode,
      showMap: validatedData.showMap ?? true,
      showOwnerInformation: validatedData.showOwnerInformation ?? true,
      isPrivate: validatedData.isPrivate ?? false,
    },
    area: areaValueToSqft(validatedData.area),
    amenities: validatedData.amenities?.split(',').map((item) => item.trim()).filter(Boolean) || [],
    images: validatedData.images?.filter((image) => image.trim() !== '') || [],
    pricing,
    owners: normalizeOwnerEntries(validatedData.owners),
    landDetails: validatedData.landDetails ? {
      ...validatedData.landDetails,
      area: areaValueToSqft(validatedData.landDetails.area),
    } as unknown as LandDetails : undefined,
    plots: validatedData.plots?.map((plot) => ({ ...plot, area: areaValueToSqft(plot.area) })) as unknown as PlotDetails[],
    apartmentUnits: validatedData.apartmentUnits?.map((unit) => ({ ...unit, area: areaValueToSqft(unit.area) })) as unknown as ApartmentUnit[],
    agency: postingContext.postingAgencyId,
    agent: validatedData.listingAgentAccountId?.trim() || postingContext.propertyAgentId,
  };

  const existingDraft = await prisma.propertyChange.findFirst({
    where: {
      accountId: input.actorId,
      status: { in: ['creation_draft', 'creation_pending', 'creating'] },
      isApproved: null,
    },
    orderBy: { modifiedOn: 'desc' },
  });

  const draftPayload = {
    accountId: input.actorId,
    propertyId: existingDraft?.propertyId ?? null,
    status: 'creation_pending',
    isApproved: null,
    createdById: postingContext.createdById,
    createdForId: postingContext.createdForId,
    workingProfileId: postingContext.workingProfileId,
    data: {
      ...serviceInput,
      postingAgencyId: postingContext.postingAgencyId,
      createdById: postingContext.createdById,
      createdForId: postingContext.createdForId,
      workingProfileId: postingContext.workingProfileId,
      transferToId: postingContext.transferToId,
      created_by: postingContext.createdById,
      transfer_to: postingContext.transferToId,
      workingProfileType: postingContext.profileType,
    } as any,
    modifiedOn: new Date(),
  };

  const draft = existingDraft
    ? await prisma.propertyChange.update({
        where: { id: existingDraft.id },
        data: draftPayload,
      })
    : await prisma.propertyChange.create({
        data: draftPayload,
      });

  return { requestId: draft.id };
}

export async function editUncreatedPropertyDraftRequest(input: {
  requestId: string;
  actorId?: string;
  postingAgencyId?: string | null;
  workingProfileId?: string | null;
  data: CreatePropertyFormValues;
}): Promise<{ requestId: string }> {
  const request = await prisma.propertyChange.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      accountId: true,
      propertyId: true,
      status: true,
      isApproved: true,
    },
  });

  if (!request || !['creation_draft', 'creation_pending', 'creating'].includes(request.status) || request.isApproved !== null) {
    throw new Error('Pending create request not found.');
  }

  if (input.actorId && request.accountId !== input.actorId) {
    throw new Error('The provided requestId does not belong to the provided accountId.');
  }

  const result = await createPropertyDraftRequest({
    actorId: request.accountId,
    postingAgencyId: input.postingAgencyId,
    workingProfileId: input.workingProfileId,
    data: input.data,
  });

  if (result.requestId !== input.requestId) {
    throw new Error('The provided requestId does not match the active pending create request.');
  }

  return result;
}

export async function saveApprovedPropertyChangeRequest(input: {
  propertyId: string;
  accountId?: string;
  data: Record<string, any>;
}): Promise<{ requestId: string }> {
  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: {
      id: true,
      isApproved: true,
    },
  });

  if (!property) {
    throw new Error('Property not found.');
  }

  if (!property.isApproved) {
    throw new Error('Only approved properties can be edited by propertyId. Use requestId for pending create requests.');
  }

  const actorId =
    input.accountId?.trim() ||
    (await prisma.propertyChange.findFirst({
      where: {
        propertyId: input.propertyId,
        isApproved: null,
      },
      orderBy: { modifiedOn: 'desc' },
      select: { accountId: true },
    }))?.accountId ||
    null;

  if (!actorId) {
    throw new Error('Provide accountId to edit an approved property.');
  }

  const existingDraft = await prisma.propertyChange.findFirst({
    where: {
      propertyId: input.propertyId,
      accountId: actorId,
      isApproved: null,
    },
    orderBy: { modifiedOn: 'desc' },
  });

  const normalizedExistingData = existingDraft ? normalizePropertyChangeData((existingDraft.data ?? {}) as Record<string, any>) : {};
  const normalizedInputData = normalizePropertyChangeData(input.data);
  const data = {
    propertyId: input.propertyId,
    accountId: actorId,
    status: 'changing',
    isApproved: existingDraft?.isApproved ?? null,
    data: existingDraft
      ? deepMergeJson(normalizedExistingData, normalizedInputData)
      : normalizedInputData,
    modifiedOn: new Date(),
  };

  const draft = existingDraft
    ? await prisma.propertyChange.update({
        where: { id: existingDraft.id },
        data,
      })
    : await prisma.propertyChange.create({ data });

  return { requestId: draft.id };
}

export async function handleBridgePropertyList(
  req: NextRequest,
  options?: {
    allowLegacyAliases?: boolean;
    filterTypeLabel?: 'agency' | 'account' | 'agent';
    routeLabel?: string;
  },
) {
  const { searchParams } = req.nextUrl;
  const allowLegacyAliases = options?.allowLegacyAliases ?? true;
  const routeLabel = options?.routeLabel ?? 'bridge/api.v1/property/list';

  try {
    const agencyId = readQueryValue(searchParams, 'agency_id', allowLegacyAliases ? 'agency' : undefined);
    const accountId = readQueryValue(searchParams, 'account_id', allowLegacyAliases ? 'agent' : undefined);

    if (!agencyId && !accountId) {
      return NextResponse.json(
        { success: false, error: 'Provide either agency_id or account_id.' },
        { status: 400 },
      );
    }

    if (agencyId && accountId) {
      return NextResponse.json(
        { success: false, error: 'Provide only one of agency_id or account_id.' },
        { status: 400 },
      );
    }

    const result = await getBridgePropertiesByAccount({
      agencyId,
      agentId: accountId,
      fields: parseFields(searchParams.get('fields')),
      limit: parsePositiveInteger(searchParams.get('limit'), 20),
      offset: parseOffset(searchParams.get('offset')),
    });

    return NextResponse.json({
      success: true,
      filter: agencyId
        ? { type: 'agency', accountId: agencyId }
        : { type: options?.filterTypeLabel ?? 'account', accountId },
      ...result,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.message.startsWith('Provide only one of ')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    throw Object.assign(error, { routeLabel });
  }
}

/*
::neup.documentation::bridge-property-view
::api GET /bridge/api.v1/property/view

::public

Returns the public bridge payload for one property by `propertyId`.

The payload uses the bridge-specific single-property shape and intentionally
excludes owner details and negotiable pricing fields.

::public end

::private

This route reads the live `property` row plus detail tables and media, then
hydrates listing account display data from `account`. Only approved properties
are exposed.

::private end

::end
*/
export async function handleBridgePropertyView(req: NextRequest) {
  const propertyId =
    req.nextUrl.searchParams.get('propertyId')?.trim() ||
    req.headers.get('propertyId')?.trim() ||
    undefined;

  if (!propertyId) {
    return NextResponse.json(
      { success: false, error: 'Provide propertyId.' },
      { status: 400 },
    );
  }

  try {
    const record = await prisma.property.findUnique({
      where: { id: propertyId },
      include: PROPERTY_VIEW_INCLUDE,
    });

    if (!record || !record.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Property not found.' },
        { status: 404 },
      );
    }

    const property = await mapPropertyViewPayload(record);

    return NextResponse.json(
      { success: true, property },
      { status: 200 },
    );
  } catch (error) {
    throw Object.assign(
      error instanceof Error ? error : new Error(String(error)),
      { routeLabel: 'bridge/api.v1/property/view' },
    );
  }
}

export async function handleBridgePropertyCreate(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workingProfileId =
    typeof body?.workingProfileId === 'string' ? body.workingProfileId.trim() :
    typeof body?.workingProfile === 'string' ? body.workingProfile.trim() :
    req.nextUrl.searchParams.get('workingProfile')?.trim() ||
    req.headers.get('workingProfileId')?.trim() ||
    req.headers.get('workingProfile')?.trim() ||
    undefined;
  const accountId =
    typeof body?.accountId === 'string' ? body.accountId.trim() :
    req.headers.get('accountId')?.trim() ||
    undefined;
  const postingAgencyId =
    typeof body?.postingAgencyId === 'string' ? body.postingAgencyId.trim() :
    req.headers.get('postingAgencyId')?.trim() ||
    req.headers.get('agencyId')?.trim() ||
    undefined;
  const propertyPayload = body?.property && typeof body.property === 'object'
    ? body.property
    : stripBridgeControlFields(body);

  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'Provide accountId in the request body or headers.' },
      { status: 400 },
    );
  }

  const missingInfo = getMissingPropertyCreateInfo(propertyPayload);
  if (missingInfo.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'missing_info',
        desc: missingInfo,
      },
      { status: 400 },
    );
  }

  try {
    const result = await createPropertyDraftRequest({
      actorId: accountId,
      postingAgencyId,
      workingProfileId,
      data: propertyPayload as CreatePropertyFormValues,
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      status: 'awaiting review',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to create property draft.';
    const status = message === 'Account not found.' ? 404 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

export async function handleBridgePropertyEdit(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workingProfileId =
    typeof body?.workingProfileId === 'string' ? body.workingProfileId.trim() :
    typeof body?.workingProfile === 'string' ? body.workingProfile.trim() :
    req.nextUrl.searchParams.get('workingProfile')?.trim() ||
    req.headers.get('workingProfileId')?.trim() ||
    req.headers.get('workingProfile')?.trim() ||
    undefined;
  const accountId =
    typeof body?.accountId === 'string' ? body.accountId.trim() :
    req.headers.get('accountId')?.trim() ||
    undefined;
  const postingAgencyId =
    typeof body?.postingAgencyId === 'string' ? body.postingAgencyId.trim() :
    req.headers.get('postingAgencyId')?.trim() ||
    req.headers.get('agencyId')?.trim() ||
    undefined;
  const requestId =
    typeof body?.requestId === 'string' ? body.requestId.trim() :
    req.headers.get('requestId')?.trim() ||
    undefined;
  const propertyId =
    typeof body?.propertyId === 'string' ? body.propertyId.trim() :
    req.headers.get('propertyId')?.trim() ||
    undefined;
  const propertyPayload = body?.property && typeof body.property === 'object'
    ? body.property
    : body?.data && typeof body.data === 'object'
      ? body.data
      : stripBridgeControlFields(body);

  if (!requestId && !propertyId) {
    return NextResponse.json(
      { success: false, error: 'Provide either requestId or propertyId.' },
      { status: 400 },
    );
  }

  if (requestId && propertyId) {
    return NextResponse.json(
      { success: false, error: 'Provide only one of requestId or propertyId.' },
      { status: 400 },
    );
  }

  if (requestId) {
    const missingInfo = getMissingPropertyCreateInfo(propertyPayload);
    if (missingInfo.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'missing_info',
          desc: missingInfo,
        },
        { status: 400 },
      );
    }

    try {
      const result = await editUncreatedPropertyDraftRequest({
        requestId,
        actorId: accountId,
        postingAgencyId,
        workingProfileId,
        data: propertyPayload as CreatePropertyFormValues,
      });

      return NextResponse.json({
        success: true,
        requestId: result.requestId,
        status: 'awaiting review',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 },
        );
      }

      const message = error instanceof Error ? error.message : 'Failed to edit property request.';
      const status = message.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { success: false, error: message },
        { status },
      );
    }
  }

  if (!propertyPayload || typeof propertyPayload !== 'object' || Array.isArray(propertyPayload) || Object.keys(propertyPayload).length === 0) {
    return NextResponse.json(
      { success: false, error: 'Provide property data to edit.' },
      { status: 400 },
    );
  }

  try {
    const result = await saveApprovedPropertyChangeRequest({
      propertyId: propertyId!,
      accountId,
      data: propertyPayload as Record<string, any>,
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      status: 'awaiting review',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to edit approved property.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
