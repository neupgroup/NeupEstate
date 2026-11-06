import { prisma } from '@neup/core/database/prisma';
import { CreateListingSchema, areaValueToSqm, type ApartmentUnit, type CreateListingFormValues, type CreateListingInput, type LandDetails, type PlotDetails } from '@/types';
import { resolveListingCreateContext, type ListingCreateContext } from '@/services/listings/create/context';
import { cleanPricing, firstPositivePrice, formatLocationString, normalizeOwnerEntries } from '@/services/listings/action-helpers';
import { logger } from '@neup/logica/logger';

export type CreateListingContext = Pick<ListingCreateContext, 'actorAccountId'> & { actorId?: string; postingAgencyId?: string | null; workingProfileId?: string | null };
export type CreateListingResult = { requestId: string };



/** Creates or refreshes the actor's awaiting-review property draft. */
/**
 * createProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function submitListingCreation(input: CreateListingFormValues, context: CreateListingContext): Promise<CreateListingResult> {
  const actorId = context.actorId ?? context.actorAccountId;
  const validatedData = CreateListingSchema.parse(input);
  const postingContext = await resolveListingCreateContext({ actorAccountId: actorId, requestedWorkingProfileId: context.workingProfileId ?? null });
  const priceDisplayMode = validatedData.pricing?.priceDisplayMode ?? 'show-price';
  const price = firstPositivePrice(validatedData.pricing);
  if (priceDisplayMode === 'show-price' && price <= 0) throw new Error('Show price requires at least one price.');
  const serviceInput: CreateListingInput = {
    ...validatedData, location: formatLocationString(validatedData.structuredLocation), price,
    details: { priceDisplayMode, showMap: validatedData.showMap ?? true, showOwnerInformation: validatedData.showOwnerInformation ?? true, isPrivate: validatedData.isPrivate ?? false },
    area: areaValueToSqm(validatedData.area), amenities: validatedData.amenities?.split(',').map((item) => item.trim()).filter(Boolean) || [],
    images: validatedData.images?.filter((image) => image.trim() !== '') || [], pricing: cleanPricing(validatedData.pricing), owners: normalizeOwnerEntries(validatedData.owners),
    landDetails: validatedData.landDetails ? { ...validatedData.landDetails, area: areaValueToSqm(validatedData.landDetails.area) } as unknown as LandDetails : undefined,
    plots: validatedData.plots?.map((plot) => ({ ...plot, area: areaValueToSqm(plot.area) })) as unknown as PlotDetails[],
    apartmentUnits: validatedData.apartmentUnits?.map((unit) => ({ ...unit, area: areaValueToSqm(unit.area) })) as unknown as ApartmentUnit[],
    agency: postingContext.postingAgencyId, listingOwner: validatedData.listingAgentAccountId?.trim() || postingContext.propertyAgentId,
  };
  const existingDraft = await prisma.listingChange.findFirst({ where: { accountId: actorId, status: { in: ['creation_draft', 'creation_pending', 'creating'] }, isApproved: null }, orderBy: { modifiedOn: 'desc' } });
  const data = { ...serviceInput, postingAgencyId: postingContext.postingAgencyId, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, transferToId: postingContext.transferToId, created_by: postingContext.createdById, transfer_to: postingContext.transferToId, workingProfileType: postingContext.profileType } as any;
  const draft = existingDraft
    ? await prisma.listingChange.update({ where: { id: existingDraft.id }, data: { data, status: 'creation_pending', isApproved: null, modifiedOn: new Date(), createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId } })
    : await prisma.listingChange.create({ data: { accountId: actorId, propertyId: null, status: 'creation_pending', isApproved: null, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, data, modifiedOn: new Date() } });
  await logger().type('property.create').data({ requestId: draft.id, actorAccountId: actorId, refreshed: Boolean(existingDraft) }).log();
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
