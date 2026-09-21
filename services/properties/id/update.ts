import { prisma } from '@neup/core/database/prisma';
export type UpdatePropertyInput = { propertyId: string; accountId: string; data: Record<string, unknown> };
export async function updateProperty(input: UpdatePropertyInput): Promise<{ requestId: string }> {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, isApproved: true } });
  if (!property) throw new Error('Property not found.');
  if (!property.isApproved) throw new Error('Only approved properties can be edited by propertyId. Use requestId for pending create requests.');
  const existing = await prisma.propertyChange.findFirst({ where: { propertyId: input.propertyId, accountId: input.accountId, isApproved: null }, orderBy: { modifiedOn: 'desc' } });
  const draftData = { ...((existing?.data ?? {}) as object), ...input.data } as any;
  const draft = existing ? await prisma.propertyChange.update({ where: { id: existing.id }, data: { data: draftData, status: 'changing', modifiedOn: new Date() } }) : await prisma.propertyChange.create({ data: { propertyId: input.propertyId, accountId: input.accountId, status: 'changing', isApproved: null, data: draftData, modifiedOn: new Date() } });
  return { requestId: draft.id };
}
