import { prisma } from '@neup/core/database/prisma';
import { CreateListingSchema, areaValueToSqm, type ApartmentUnit, type CreateListingFormValues, type CreateListingInput, type LandDetails, type PlotDetails } from '@/types';
import { resolveListingCreateContext, type ListingCreateContext } from '@/services/listings/create/context';
import { cleanPricing, firstPositivePrice, formatLocationString, normalizeOwnerEntries } from '@/services/listings/action-helpers';
import { getListingCreationRequirements, type ListingCreationInitialization } from '@/services/listings/create/initialize';

export type CreateListingContext = Pick<ListingCreateContext, 'actorAccountId'> & { actorId?: string; postingAgencyId?: string | null; workingProfileId?: string | null };
export type CreateListingResult = { requestId: string };

// Merge a dotted request key into a nested listing-data object without replacing sibling values.
function setNestedValue(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.').filter(Boolean);
  let current = target;
  for (const key of keys.slice(0, -1)) {
    const child = current[key];
    if (!child || typeof child !== 'object' || Array.isArray(child)) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  if (keys.length) current[keys[keys.length - 1]] = value;
}

// Resolve a user-facing location name to the internal location record required by listing storage.
async function resolveListingLocation(value: string, structuredLocation: unknown): Promise<{ locationId: string; structuredLocation?: unknown }> {
  const locationText = value.trim();
  if (!locationText) throw Object.assign(new Error('Location is required.'), { details: { location: ['Enter a location name.'] } });

  const locationParts = locationText.split(',').map((part) => part.trim()).filter(Boolean);
  const structured = structuredLocation && typeof structuredLocation === 'object' && !Array.isArray(structuredLocation)
    ? structuredLocation as Record<string, unknown>
    : {};
  const structuredCandidates = [structured.municipality, structured.district, structured.province]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());
  const candidates = [...new Set([...structuredCandidates, locationText, ...locationParts])];
  let record: { id: string } | null = null;
  for (const candidate of candidates) {
    record = await prisma.location.findFirst({
      where: {
        status: 'active',
        OR: [
          { title: { equals: candidate, mode: 'insensitive' } },
          { slug: { equals: candidate, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
      select: { id: true },
    });
    if (record) break;
  }
  if (!record) {
    throw Object.assign(new Error(`No active location matches "${locationText}".`), {
      details: { location: ['Use a location name available in the location list.'] },
    });
  }

  return {
    locationId: record.id,
    ...(Object.keys(structured).length ? {} : { structuredLocation: { street: locationText } }),
  };
}

// Normalize category and location aliases, then validate fields supplied in this incremental update.
async function normalizeListingCreationPatch(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const normalized = { ...patch };
  for (const key of Object.keys(normalized)) {
    if (key.includes('.')) {
      const value = normalized[key];
      delete normalized[key];
      setNestedValue(normalized, key, value);
    }
  }
  if (normalized.type && !normalized.category) normalized.category = normalized.type;
  delete normalized.type;
  if (typeof normalized.category === 'string') {
    const categoryOptions = ['House', 'Bungalow', 'Villa', 'Multiplex', 'Land', 'Apartment', 'Penthouse', 'Commercial Space', 'Shop Space', 'Flat'];
    normalized.category = categoryOptions.find((option) => option.toLowerCase() === normalized.category?.toString().toLowerCase()) ?? normalized.category;
  }
  const locationText = typeof normalized.location === 'string' ? normalized.location : undefined;
  if (locationText) {
    const resolvedLocation = await resolveListingLocation(locationText, normalized.structuredLocation);
    normalized.locationId = resolvedLocation.locationId;
    if (resolvedLocation.structuredLocation) normalized.structuredLocation = resolvedLocation.structuredLocation;
  }
  const parsed = CreateListingSchema.partial().safeParse(normalized);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw Object.assign(new Error('Invalid listing information.'), { details });
  }
  return { ...parsed.data, ...(locationText ? { location: locationText.trim() } : {}) } as Record<string, unknown>;
}

// Validate and persist an incremental guided-form update for an existing creation ID.
export async function addListingCreationInfo(input: {
  creationId: string;
  actorAccountId: string;
  patch: Record<string, unknown>;
}): Promise<ListingCreationInitialization & { complete: boolean }> {
  const request = await prisma.listingChange.findUnique({
    where: { id: input.creationId },
    select: { id: true, accountId: true, status: true, isApproved: true, data: true, createdById: true, createdForId: true, workingProfileId: true },
  });
  if (!request || request.accountId !== input.actorAccountId || !['creation_draft', 'creation_pending'].includes(request.status) || request.isApproved !== null) {
    throw new Error('Creation request not found or unavailable.');
  }

  const savedData = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
    ? request.data as Record<string, unknown>
    : {};
  const guidedFormData = savedData._guidedFormData && typeof savedData._guidedFormData === 'object' && !Array.isArray(savedData._guidedFormData)
    ? savedData._guidedFormData as Record<string, unknown>
    : savedData;
  const current = guidedFormData
    ? { ...guidedFormData }
    : {};
  const incoming = await normalizeListingCreationPatch(input.patch);
  const purposeChanged = typeof incoming.purpose === 'string' && incoming.purpose !== current.purpose;
  const categoryChanged = typeof incoming.category === 'string' && incoming.category !== current.category;
  for (const [key, value] of Object.entries(incoming)) setNestedValue(current, key, value);
  if (incoming.purpose !== undefined) current.purpose = incoming.purpose;
  if (incoming.category !== undefined) current.category = incoming.category;
  if ((purposeChanged || categoryChanged) && current.pricing && typeof current.pricing === 'object') {
    const pricing = { ...(current.pricing as Record<string, unknown>) };
    delete pricing.basis;
    delete pricing.basisPrices;
    delete pricing.basisNegotiable;
    delete pricing.basisNegotiablePrices;
    delete pricing.basisFrequencies;
    delete pricing.basisUnits;
    delete pricing.listed;
    current.pricing = pricing;
  }
  if (categoryChanged) {
    delete current.landDetails;
    delete current.plots;
    delete current.apartmentDetails;
    delete current.apartmentUnits;
  }
  current.stage = 'collecting';

  const completeParse = CreateListingSchema.safeParse(current);
  const required = getListingCreationRequirements(current);
  const complete = completeParse.success && required.length === 0;
  if (completeParse.success) {
    const submitted = await submitListingCreation(completeParse.data as CreateListingFormValues, {
      actorAccountId: input.actorAccountId,
      workingProfileId: request.workingProfileId,
    }, request.id);
    const submittedRecord = await prisma.listingChange.findUniqueOrThrow({ where: { id: submitted.requestId }, select: { data: true } });
    await prisma.listingChange.update({
      where: { id: submitted.requestId },
      data: { data: { ...(submittedRecord.data as Record<string, unknown>), _guidedFormData: { ...completeParse.data, location: current.location } } },
    });
    return {
      creationId: request.id,
      stage: 'ready_for_review',
      type: typeof current.category === 'string' ? current.category : null,
      purpose: typeof current.purpose === 'string' ? current.purpose : null,
      required,
      complete: true,
    };
  }
  await prisma.listingChange.update({
    where: { id: request.id },
    data: {
      data: current,
      status: complete ? 'creation_pending' : 'creation_draft',
      modifiedOn: new Date(),
      createdById: request.createdById,
      createdForId: request.createdForId,
      workingProfileId: request.workingProfileId,
    },
  });

  return {
    creationId: request.id,
    stage: complete ? 'ready_for_review' : 'collecting',
    type: typeof current.category === 'string' ? current.category : null,
    purpose: typeof current.purpose === 'string' ? current.purpose : null,
    required,
    complete,
  };
}



/** Creates or refreshes the actor's awaiting-review property draft. */
/**
 * createProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function submitListingCreation(input: CreateListingFormValues, context: CreateListingContext, targetRequestId?: string): Promise<CreateListingResult> {
  const actorId = context.actorId ?? context.actorAccountId;
  const validatedData = CreateListingSchema.parse(input);
  const postingContext = await resolveListingCreateContext({ actorAccountId: actorId, requestedWorkingProfileId: context.workingProfileId ?? null });
  const priceDisplayMode = validatedData.pricing?.priceDisplayMode ?? 'show-price';
  const price = firstPositivePrice(validatedData.pricing);
  if (priceDisplayMode === 'show-price' && price <= 0) throw new Error('Show price requires at least one price.');
  const serviceInput: CreateListingInput = {
    ...validatedData, location: formatLocationString(validatedData.structuredLocation), locationId: validatedData.locationId, price,
    details: { priceDisplayMode, showMap: validatedData.showMap ?? true, showOwnerInformation: validatedData.showOwnerInformation ?? true, isPrivate: validatedData.isPrivate ?? false },
    area: areaValueToSqm(validatedData.area), amenities: validatedData.amenities?.split(',').map((item) => item.trim()).filter(Boolean) || [],
    images: validatedData.images?.filter((image) => image.trim() !== '') || [], pricing: cleanPricing(validatedData.pricing), owners: normalizeOwnerEntries(validatedData.owners),
    landDetails: validatedData.landDetails ? { ...validatedData.landDetails, area: areaValueToSqm(validatedData.landDetails.area) } as unknown as LandDetails : undefined,
    plots: validatedData.plots?.map((plot) => ({ ...plot, area: areaValueToSqm(plot.area) })) as unknown as PlotDetails[],
    apartmentUnits: validatedData.apartmentUnits?.map((unit) => ({ ...unit, area: areaValueToSqm(unit.area) })) as unknown as ApartmentUnit[],
    agency: postingContext.postingAgencyId, listingOwner: validatedData.listingAgentAccountId?.trim() || postingContext.propertyAgentId,
  };
  const existingDraft = targetRequestId
    ? await prisma.listingChange.findFirst({ where: { id: targetRequestId, accountId: actorId, status: { in: ['creation_draft', 'creation_pending', 'creating'] }, isApproved: null } })
    : await prisma.listingChange.findFirst({ where: { accountId: actorId, status: { in: ['creation_draft', 'creation_pending', 'creating'] }, isApproved: null }, orderBy: { modifiedOn: 'desc' } });
  if (targetRequestId && !existingDraft) throw new Error('Creation request not found or unavailable.');
  const data = { ...serviceInput, postingAgencyId: postingContext.postingAgencyId, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, transferToId: postingContext.transferToId, created_by: postingContext.createdById, transfer_to: postingContext.transferToId, workingProfileType: postingContext.profileType } as any;
  const draft = existingDraft
    ? await prisma.listingChange.update({ where: { id: existingDraft.id }, data: { data, status: 'creation_pending', isApproved: null, modifiedOn: new Date(), createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId } })
    : await prisma.listingChange.create({ data: { accountId: actorId, propertyId: null, status: 'creation_pending', isApproved: null, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, data, modifiedOn: new Date() } });
  return { requestId: draft.id };
}



/**
 * createPropertyDraftRequest handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function createListingDraftRequest(input: { actorId: string; postingAgencyId?: string | null; workingProfileId?: string | null; data: CreateListingFormValues }) {
  return submitListingCreation(input.data, { actorAccountId: input.actorId, postingAgencyId: input.postingAgencyId, workingProfileId: input.workingProfileId });
}



/**
 * editUncreatedPropertyDraftRequest handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function editUncreatedListingDraftRequest(input: { requestId: string; actorId?: string; postingAgencyId?: string | null; workingProfileId?: string | null; data: CreateListingFormValues }) {
  const request = await prisma.listingChange.findUnique({ where: { id: input.requestId }, select: { id: true, accountId: true, propertyId: true, status: true, isApproved: true } });
  if (!request || !['creation_draft', 'creation_pending', 'creating'].includes(request.status) || request.isApproved !== null) throw new Error('Pending create request not found.');
  if (!request.accountId) throw new Error('The pending request has no requesting account.');
  if (input.actorId && request.accountId !== input.actorId) throw new Error('The provided requestId does not belong to the provided accountId.');
  const result = await submitListingCreation(input.data, { actorAccountId: request.accountId, postingAgencyId: input.postingAgencyId, workingProfileId: input.workingProfileId });
  if (result.requestId !== input.requestId) throw new Error('The provided requestId does not match the active pending create request.');
  return result;
}
