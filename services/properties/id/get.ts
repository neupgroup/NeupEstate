import { prisma } from '@neup/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import type { Property } from '@/types';
import { PROPERTY_INCLUDE, hydratePropertyAccountLabels, mapRecord, pickPropertyFields, resolveBridgePropertyFields } from '@/services/property/shared';

export type GetPropertyInput = { propertyId?: string; propertyCode?: string; fields?: string[] };

/** Retrieves one approved property by id or custom code. */
export async function getProperty(input: GetPropertyInput): Promise<(Partial<Property> & Record<string, unknown>) | null> {
  const propertyId = input.propertyId?.trim();
  const propertyCode = input.propertyCode?.trim();
  if (!propertyId && !propertyCode) throw new Error('Provide propertyId or propertyCode.');
  try {
    const record = await prisma.property.findFirst({ where: propertyId ? { id: propertyId } : { customId: propertyCode }, include: PROPERTY_INCLUDE });
    if (!record || !record.isApproved) return null;
    const [property] = await hydratePropertyAccountLabels([mapRecord(record)]);
    return pickPropertyFields(property, resolveBridgePropertyFields(input.fields));
  } catch (error) {
    await logProblem(error, 'getProperty');
    throw error;
  }
}
