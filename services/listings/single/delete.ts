import { prisma } from '@neup/core/database/prisma';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;
import { logger } from '@neup/logica/logger';

export type DeleteListingInput = { propertyId: string };
export type DeleteListingContext = { actorAccountId: string };



/** Authorizes and permanently deletes a property and its dependent records. */
/**
 * deleteProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function deleteListing(input: DeleteListingInput, context: DeleteListingContext): Promise<void> {
  if (!context.actorAccountId.trim()) throw new Error('Authenticated account is required.');
  await requirePermission(PERMISSIONS.manage.propertySelfDelete);
  const property = await prisma.listing.findUnique({ where: { id: input.propertyId }, select: { id: true } });
  if (!property) throw new Error('Property not found.');
  await prisma.$transaction(async (transaction) => {
    await transaction.listingMedia.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.propertyOwner.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.listingChange.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.listing.delete({ where: { id: input.propertyId } });
  });
  await logger().type('property.delete').data({ propertyId: input.propertyId, actorAccountId: context.actorAccountId }).log();
}
