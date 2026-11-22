import { prisma } from '@neup/core/database/prisma';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;
import { parseListingSlugId } from '@/services/listings/slug';

export type DeleteListingInput = { slug: string };
export type DeleteListingContext = { actorAccountId: string };



/** Authorizes and permanently deletes a property and its dependent records. */
/**
 * deleteProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function deleteListing(input: DeleteListingInput, context: DeleteListingContext): Promise<void> {
  if (!context.actorAccountId.trim()) throw new Error('Authenticated account is required.');
  await requirePermission(PERMISSIONS.estate.listing.drop);
  const parsedSlug = parseListingSlugId(input.slug);
  const property = parsedSlug
    ? await prisma.listing.findFirst({ where: { id: parsedSlug.id, slug: parsedSlug.slug }, select: { id: true } })
    : null;
  if (!property) throw new Error('Property not found.');
  await prisma.$transaction(async (transaction) => {
    await transaction.propertyOwner.deleteMany({ where: { propertyId: property.id } });
    await transaction.listingChange.deleteMany({ where: { propertyId: property.id } });
    await transaction.listing.delete({ where: { id: property.id } });
  });
}
