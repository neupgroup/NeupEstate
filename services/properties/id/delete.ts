import { prisma } from '@neup/core/database/prisma';
import { requirePermission, PERMISSIONS } from '@/services/permissions';
import { logger } from '@neup/logica/logger';

export type DeletePropertyInput = { propertyId: string };
export type DeletePropertyContext = { actorAccountId: string };



/** Authorizes and permanently deletes a property and its dependent records. */
/**
 * deleteProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function deleteProperty(input: DeletePropertyInput, context: DeletePropertyContext): Promise<void> {
  if (!context.actorAccountId.trim()) throw new Error('Authenticated account is required.');
  await requirePermission(PERMISSIONS.manage.propertySelfDelete);
  const property = await prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true } });
  if (!property) throw new Error('Property not found.');
  await prisma.$transaction(async (transaction) => {
    await transaction.propertyMedia.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.propertyOwner.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.propertyPrice.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.propertyChange.deleteMany({ where: { propertyId: input.propertyId } });
    await transaction.property.delete({ where: { id: input.propertyId } });
  });
  await logger().type('property.delete').data({ propertyId: input.propertyId, actorAccountId: context.actorAccountId }).log();
}
