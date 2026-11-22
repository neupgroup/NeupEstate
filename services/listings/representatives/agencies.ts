import { prisma } from '@neup/core/database/prisma';
import { parseListingSlugId } from '@/services/listings/slug';

export type AgencyRepresentative = {
  id: string;
  type: 'agency';
  name: string | null;
  image: string | null;
};

export async function getListingAgencyRepresentative(slug?: string | null): Promise<AgencyRepresentative[]> {
  const parsedSlug = slug ? parseListingSlugId(slug) : null;
  if (!parsedSlug) return [];
  const property = await prisma.listing.findFirst({ where: { id: parsedSlug.id, slug: parsedSlug.slug }, select: { id: true } });
  if (!property) return [];
  const entry = await prisma.listingsRepresentatives.findFirst({
    where: {
      listingId: property.id,
      role: 'listingOwner',
      representative: { accountType: { in: ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'] } },
    },
    include: { representative: { select: { id: true, displayName: true, displayImage: true } } },
  });
  if (!entry) return [];
  const [agency, account] = await Promise.all([
    prisma.agency.findUnique({ where: { id: entry.representative.id }, select: { name: true, logoUrl: true } }),
    prisma.account.findUnique({ where: { id: entry.representative.id }, select: { displayName: true, displayImage: true } }),
  ]);
  return [{
    id: entry.representative.id,
    type: 'agency',
    name: agency?.name ?? account?.displayName ?? null,
    image: agency?.logoUrl ?? account?.displayImage ?? null,
  }];
}
