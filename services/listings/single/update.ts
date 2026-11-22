import { prisma } from '@neup/core/database/prisma';
import { parseListingSlugId } from '@/services/listings/slug';
export type UpdateListingInput = { slug: string; accountId: string; data: Record<string, unknown> };
/**
 * updateProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function updateListing(input: UpdateListingInput): Promise<{ requestId: string }> {
  const parsedSlug = parseListingSlugId(input.slug);
  const property = parsedSlug
    ? await prisma.listing.findFirst({ where: { id: parsedSlug.id, slug: parsedSlug.slug }, select: { id: true, isApproved: true } })
    : null;
  if (!property) throw new Error('Property not found.');
  if (!property.isApproved) throw new Error('Only approved properties can be edited by slug. Use requestId for pending create requests.');
  const existing = await prisma.listingChange.findFirst({ where: { propertyId: property.id, accountId: input.accountId, isApproved: null }, orderBy: { modifiedOn: 'desc' } });
  const draftData = { ...((existing?.data ?? {}) as object), ...input.data } as any;
  const draft = existing ? await prisma.listingChange.update({ where: { id: existing.id }, data: { data: draftData, status: 'changing', modifiedOn: new Date() } }) : await prisma.listingChange.create({ data: { propertyId: property.id, accountId: input.accountId, status: 'changing', isApproved: null, data: draftData, modifiedOn: new Date() } });
  return { requestId: draft.id };
}
