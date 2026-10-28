'use server';

import { prisma } from '@neup/core/database/prisma';

const AGENCY_ACCOUNT_TYPES = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'];

export type AccountProfileType = 'independentAgent' | 'agency' | 'companyAgent';

function accountTypeFilter(type: AccountProfileType) {
  if (type === 'agency') return { accountType: { in: AGENCY_ACCOUNT_TYPES } };
  if (type === 'independentAgent') {
    return {
      accountType: 'individual.agent',
      agencyAgentMapAsAgent: { none: { status: 'accepted' } },
    };
  }
  return {
    accountType: 'individual.agent',
    agencyAgentMapAsAgent: { some: { status: 'accepted' } },
  };
}

export async function listAccountProfiles(type: AccountProfileType, offset: number, limit: number) {
  const where = accountTypeFilter(type);
  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit,
      select: { id: true, neupId: true, accountType: true, displayName: true, displayImage: true },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      type: account.accountType,
      name: account.displayName?.trim() || account.neupId || account.id,
      image: account.displayImage,
      neupid: account.neupId,
    })),
    total,
  };
}

export async function getAccountProfile(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    select: {
      id: true,
      neupId: true,
      accountType: true,
      displayName: true,
      displayImage: true,
      coverImage: true,
      bio: true,
      workingProfile: true,
      agencyAgentMapAsAgent: {
        where: { status: 'accepted' },
        select: {
          agency: {
            select: { id: true, neupId: true, displayName: true, displayImage: true },
          },
        },
      },
    },
  });

  if (!account) return null;

  const [propertyCount, associatedAgencies] = await Promise.all([
    prisma.property.count({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        representatives: { some: { representativeId: id } },
      },
    }),
    account.agencyAgentMapAsAgent.map(({ agency }) => agency),
  ]);

  const agencies = Array.from(
    new Map(associatedAgencies.map((agency) => [agency.id, agency])).values(),
  ).map((agency) => ({
    id: agency.id,
    name: agency.displayName?.trim() || agency.neupId || agency.id,
    image: agency.displayImage,
    neupid: agency.neupId,
    isPrimary: account.workingProfile === agency.id,
  }));

  return {
    profile: {
      id: account.id,
      type: account.accountType,
      name: account.displayName?.trim() || account.neupId || account.id,
      image: account.displayImage,
      cover: account.coverImage,
      neupid: account.neupId,
      bio: account.bio,
      isVerified: account.accountType !== 'guest',
    },
    agencies,
    properties: { count: propertyCount },
  };
}


