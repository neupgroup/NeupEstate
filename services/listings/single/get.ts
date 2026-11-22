import { prisma } from '@neup/core/database/prisma';
import type { Listing } from '@/types';
import { PROPERTY_INCLUDE, hydrateListingAccountLabels, mapRecord, pickListingFields, resolveBridgeListingFields } from '@/services/listings/shared';
import { parseListingSlugId } from '@/services/listings/slug';
import { getListingSlugId } from '@/services/listings/slug';

export type GetListingInput = { slug?: string; propertyCode?: string; fields?: string[] };



/**
 * Retrieves one approved property by canonical slug-and-ID identifier or custom code.
 *
 * Handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
*/
export async function getListing(input: GetListingInput): Promise<(Partial<Listing> & Record<string, unknown>) | null> {
  const slug = input.slug?.trim();
  const propertyCode = input.propertyCode?.trim();
  if (!slug && !propertyCode) throw new Error('Provide slug or propertyCode.');
  try {
    const parsedSlug = slug ? parseListingSlugId(slug) : null;
    const record = await prisma.listing.findFirst({
      where: parsedSlug
        ? { id: parsedSlug.id, slug: parsedSlug.slug }
        : propertyCode
          ? { customId: propertyCode }
          : { id: '__invalid_listing_identifier__' },
      include: PROPERTY_INCLUDE,
    });
    if (!record || !record.isApproved) return null;
    const [property] = await hydrateListingAccountLabels([mapRecord(record)]);
    const selectedListing = pickListingFields(property, resolveBridgeListingFields(input.fields).filter((field) => field !== 'id'));
    delete selectedListing.id;
    selectedListing.slug = getListingSlugId(property);
    return selectedListing;
  } catch (error) {
    throw error;
  }
}
