import { prisma } from '@neup/core/database/prisma';
import { requirePermission, PERMISSIONS } from '@/services/permissions';

export type DeletePropertyInput = { propertyId: string };
export type DeletePropertyContext = { actorAccountId: string };

/** Authorizes and permanently deletes a property and its dependent records. */
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
}
