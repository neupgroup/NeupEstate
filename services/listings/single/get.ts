import { prisma } from '@neup/core/database/prisma';
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
    const record = await prisma.listing.findFirst({ where: propertyId ? { id: propertyId } : { customId: propertyCode }, include: PROPERTY_INCLUDE });
    if (!record || !record.isApproved) return null;
    const [property] = await hydrateListingAccountLabels([mapRecord(record)]);
    const selectedListing = pickListingFields(property, resolveBridgeListingFields(input.fields));
    return selectedListing;
  } catch (error) {
    throw error;
  }
}
