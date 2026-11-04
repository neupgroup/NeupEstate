import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { Listing } from '@/types';
import { PROPERTY_INCLUDE, hydrateListingAccountLabels, mapRecord, pickListingFields, resolveBridgeListingFields } from '@/services/listings/shared';

export type GetListingInput = { propertyId?: string; propertyCode?: string; fields?: string[] };



/**
 * Retrieves one approved property by id or custom code.
 *
 * Handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
*/
export async function getListing(input: GetListingInput): Promise<(Partial<Listing> & Record<string, unknown>) | null> {
  const propertyId = input.propertyId?.trim();
  const propertyCode = input.propertyCode?.trim();
  if (!propertyId && !propertyCode) throw new Error('Provide propertyId or propertyCode.');
  try {
    const loggerResponse = await logger().type('property.get.called').data({ propertyId: propertyId ?? null, propertyCode: propertyCode ?? null, fields: input.fields ?? null }).log();
    if (!loggerResponse.ok) console.error('[property.get] Logger request failed.', loggerResponse.status, loggerResponse.body);
    const record = await prisma.listing.findFirst({ where: propertyId ? { id: propertyId } : { customId: propertyCode }, include: PROPERTY_INCLUDE });
    if (!record || !record.isApproved) return null;
    const [property] = await hydrateListingAccountLabels([mapRecord(record)]);
    const selectedListing = pickListingFields(property, resolveBridgeListingFields(input.fields));
    const resultLoggerResponse = await logger().type('property.get').data({ propertyId: property.id, propertyCode: propertyCode ?? null }).log();
    if (!resultLoggerResponse.ok) console.error('[property.get] Logger request failed.', resultLoggerResponse.status, resultLoggerResponse.body);
    return selectedListing;
  } catch (error) {
    await logger().type('getProperty').data({ error: String(error), details: {} }).log();
    throw error;
  }
}
