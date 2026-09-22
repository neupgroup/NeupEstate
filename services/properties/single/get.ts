import { prisma } from '@neup/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import { logger } from '@neup/logica/logger';
import type { Property } from '@/types';
import { PROPERTY_INCLUDE, hydratePropertyAccountLabels, mapRecord, pickPropertyFields, resolveBridgePropertyFields } from '@/services/properties/shared';

export type GetPropertyInput = { propertyId?: string; propertyCode?: string; fields?: string[] };



/**
 * Retrieves one approved property by id or custom code.
 *
 * Handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
*/
export async function getProperty(input: GetPropertyInput): Promise<(Partial<Property> & Record<string, unknown>) | null> {
  const propertyId = input.propertyId?.trim();
  const propertyCode = input.propertyCode?.trim();
  if (!propertyId && !propertyCode) throw new Error('Provide propertyId or propertyCode.');
  try {
    const loggerResponse = await logger().type('property.get.called').data({ propertyId: propertyId ?? null, propertyCode: propertyCode ?? null, fields: input.fields ?? null }).log();
    if (!loggerResponse.ok) console.error('[property.get] Logger request failed.', loggerResponse.status, loggerResponse.body);
    const record = await prisma.property.findFirst({ where: propertyId ? { id: propertyId } : { customId: propertyCode }, include: PROPERTY_INCLUDE });
    if (!record || !record.isApproved) return null;
    const [property] = await hydratePropertyAccountLabels([mapRecord(record)]);
    const selectedProperty = pickPropertyFields(property, resolveBridgePropertyFields(input.fields));
    const resultLoggerResponse = await logger().type('property.get').data({ propertyId: property.id, propertyCode: propertyCode ?? null }).log();
    if (!resultLoggerResponse.ok) console.error('[property.get] Logger request failed.', resultLoggerResponse.status, resultLoggerResponse.body);
    return selectedProperty;
  } catch (error) {
    await logProblem(error, 'getProperty');
    throw error;
  }
}
