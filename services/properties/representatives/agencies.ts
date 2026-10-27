import { prisma } from '@neup/core/database/prisma';

export type AgencyRepresentative = {
  id: string;
  type: 'agency';
  name: string | null;
  image: string | null;
};

export async function getPropertyAgencyRepresentative(agencyId?: string | null): Promise<AgencyRepresentative[]> {
  const id = agencyId?.trim();
  if (!id || id === 'unknown') return [];

  const agency = await prisma.agency.findUnique({
    where: { id },
    select: { id: true, name: true, logoUrl: true },
  });
  const account = agency ? null : await prisma.account.findUnique({
    where: { id },
    select: { id: true, displayName: true, displayImage: true },
  });

  return [{
    id,
    type: 'agency',
    name: agency?.name ?? account?.displayName ?? null,
    image: agency?.logoUrl ?? account?.displayImage ?? null,
  }];
}
