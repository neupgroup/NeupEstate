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

  const isAgencyAccount = AGENCY_ACCOUNT_TYPES.includes(account.accountType);
  const [propertyCount, associatedAgencies, agentContact, agencyContact] = await Promise.all([
    prisma.property.count({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        representatives: { some: { representativeId: id } },
      },
    }),
    account.agencyAgentMapAsAgent.map(({ agency }) => agency),
    account.accountType === 'individual.agent'
      ? prisma.agent.findFirst({ where: { userId: id }, select: { email: true, phone: true } })
      : Promise.resolve(null),
    isAgencyAccount
      ? prisma.agency.findUnique({ where: { id }, select: { contactEmail: true, contactPhone: true } })
      : Promise.resolve(null),
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
    contact: {
      email: agentContact?.email ?? agencyContact?.contactEmail ?? null,
      phone: agentContact?.phone ?? agencyContact?.contactPhone ?? null,
    },
    properties: { count: propertyCount },
  };
}

/** Resolve a public account profile by its NeupID handle. */
export async function getAccountProfileByNeupId(neupId: string) {
  const account = await prisma.account.findUnique({
    where: { neupId },
    select: { id: true },
  });

  return account ? getAccountProfile(account.id) : null;
}


