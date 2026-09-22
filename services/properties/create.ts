import { prisma } from '@neup/core/database/prisma';
import { CreatePropertySchema, areaValueToSqft, type ApartmentUnit, type CreatePropertyFormValues, type CreatePropertyInput, type LandDetails, type PlotDetails } from '@/types';
import { resolvePropertyPostingContext, type PropertyPostingContext } from '@/services/property-posting-context';
import { cleanPricing, firstPositivePrice, formatLocationString, normalizeOwnerEntries } from '@/services/property/action-helpers';
import { logger } from '@neup/logica/logger';

export type CreatePropertyContext = Pick<PropertyPostingContext, 'actorAccountId'> & { actorId?: string; postingAgencyId?: string | null; workingProfileId?: string | null };
export type CreatePropertyResult = { requestId: string };

/** Creates or refreshes the actor's awaiting-review property draft. */
export async function createProperty(input: CreatePropertyFormValues, context: CreatePropertyContext): Promise<CreatePropertyResult> {
  const actorId = context.actorId ?? context.actorAccountId;
  const validatedData = CreatePropertySchema.parse(input);
  const postingContext = await resolvePropertyPostingContext({ actorAccountId: actorId, requestedWorkingProfileId: context.workingProfileId ?? null });
  const purposes = validatedData.purposes?.length ? validatedData.purposes : validatedData.purpose ? [validatedData.purpose] : [];
  if (!purposes.length) throw new Error('Please select at least one purpose.');
  const priceDisplayMode = validatedData.pricing?.priceDisplayMode ?? 'show-price';
  const price = firstPositivePrice(validatedData.pricing);
  if (priceDisplayMode === 'show-price' && price <= 0) throw new Error('Show price requires at least one price.');
  const serviceInput: CreatePropertyInput = {
    ...validatedData, purpose: purposes[0], purposes, location: formatLocationString(validatedData.structuredLocation), price,
    details: { priceDisplayMode, showMap: validatedData.showMap ?? true, showOwnerInformation: validatedData.showOwnerInformation ?? true, isPrivate: validatedData.isPrivate ?? false },
    area: areaValueToSqft(validatedData.area), amenities: validatedData.amenities?.split(',').map((item) => item.trim()).filter(Boolean) || [],
    images: validatedData.images?.filter((image) => image.trim() !== '') || [], pricing: cleanPricing(validatedData.pricing), owners: normalizeOwnerEntries(validatedData.owners),
    landDetails: validatedData.landDetails ? { ...validatedData.landDetails, area: areaValueToSqft(validatedData.landDetails.area) } as unknown as LandDetails : undefined,
    plots: validatedData.plots?.map((plot) => ({ ...plot, area: areaValueToSqft(plot.area) })) as unknown as PlotDetails[],
    apartmentUnits: validatedData.apartmentUnits?.map((unit) => ({ ...unit, area: areaValueToSqft(unit.area) })) as unknown as ApartmentUnit[],
    agency: postingContext.postingAgencyId, agent: validatedData.listingAgentAccountId?.trim() || postingContext.propertyAgentId,
  };
  const existingDraft = await prisma.propertyChange.findFirst({ where: { accountId: actorId, status: { in: ['creation_draft', 'creation_pending', 'creating'] }, isApproved: null }, orderBy: { modifiedOn: 'desc' } });
  const data = { ...serviceInput, postingAgencyId: postingContext.postingAgencyId, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, transferToId: postingContext.transferToId, created_by: postingContext.createdById, transfer_to: postingContext.transferToId, workingProfileType: postingContext.profileType } as any;
  const draft = existingDraft
    ? await prisma.propertyChange.update({ where: { id: existingDraft.id }, data: { data, status: 'creation_pending', isApproved: null, modifiedOn: new Date(), createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId } })
    : await prisma.propertyChange.create({ data: { accountId: actorId, propertyId: null, status: 'creation_pending', isApproved: null, createdById: postingContext.createdById, createdForId: postingContext.createdForId, workingProfileId: postingContext.workingProfileId, data, modifiedOn: new Date() } });
  await logger().type('property.create').data({ requestId: draft.id, actorAccountId: actorId, refreshed: Boolean(existingDraft) }).log();
  return { requestId: draft.id };
}

export async function createPropertyDraftRequest(input: { actorId: string; postingAgencyId?: string | null; workingProfileId?: string | null; data: CreatePropertyFormValues }) {
  return createProperty(input.data, { actorAccountId: input.actorId, postingAgencyId: input.postingAgencyId, workingProfileId: input.workingProfileId });
}

export async function editUncreatedPropertyDraftRequest(input: { requestId: string; actorId?: string; postingAgencyId?: string | null; workingProfileId?: string | null; data: CreatePropertyFormValues }) {
  const request = await prisma.propertyChange.findUnique({ where: { id: input.requestId }, select: { id: true, accountId: true, propertyId: true, status: true, isApproved: true } });
  if (!request || !['creation_draft', 'creation_pending', 'creating'].includes(request.status) || request.isApproved !== null) throw new Error('Pending create request not found.');
  if (input.actorId && request.accountId !== input.actorId) throw new Error('The provided requestId does not belong to the provided accountId.');
  const result = await createProperty(input.data, { actorAccountId: request.accountId, postingAgencyId: input.postingAgencyId, workingProfileId: input.workingProfileId });
  if (result.requestId !== input.requestId) throw new Error('The provided requestId does not match the active pending create request.');
  return result;
}
