import { prisma } from '@neup/core/database/prisma';

export type AgencyRepresentative = {
  id: string;
  type: 'agency';
  name: string | null;
  image: string | null;
};

export async function getPropertyAgencyRepresentative(propertyId?: string | null): Promise<AgencyRepresentative[]> {
  const id = propertyId?.trim();
  if (!id) return [];
  const entry = await prisma.propertyRepresentative.findFirst({
    where: {
      propertyId: id,
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
