'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { Agency, CreateAgencyInput, UpdateAgencyInput } from '@/types';
import { isAgencyLikeAccountType } from '@/services/accounts/type';
import { filter, type Filters } from '@/services/agents/filter';

export type PublicAgencyAccount = {
  id: string;
  neupId: string | null;
  name: string;
  logoUrl: string;
  agentCount: number;
  propertyCount: number;
};

export type PublicAccountProfile = PublicAgencyAccount & {
  accountType: string;
};

function normalizeHandle(value: string): string {
  return decodeURIComponent(value).replace(/^@+/, '').trim();
}

function mapPublicAgencyAccount(
  record: {
    id: string;
    neupId: string | null;
    displayName: string | null;
    displayImage: string | null;
  },
  counts?: {
    agentCount?: number;
    propertyCount?: number;
  },
): PublicAgencyAccount {
  return {
    id: record.id,
    neupId: record.neupId ?? null,
    name: record.displayName?.trim() || record.id,
    logoUrl: record.displayImage || 'https://placehold.co/200x80.png',
    agentCount: counts?.agentCount ?? 0,
    propertyCount: counts?.propertyCount ?? 0,
  };
}

function mapPublicAccountProfile(
  record: {
    id: string;
    neupId: string | null;
    displayName: string | null;
    displayImage: string | null;
    accountType: string;
  },
  counts?: {
    agentCount?: number;
    propertyCount?: number;
  },
): PublicAccountProfile {
  return {
    ...mapPublicAgencyAccount(record, counts),
    accountType: record.accountType,
  };
}

async function getAgencyCounts(accountId: string) {
  const [agentCount, propertyCount] = await Promise.all([
    prisma.agencyAgentMap.count({
      where: {
        agencyId: accountId,
        status: 'accepted',
      },
    }),
    prisma.property.count({
      where: {
        agency: accountId,
      },
    }),
  ]);

  return { agentCount, propertyCount };
}

function mapRecord(a: any): Agency {
  return {
    id:             a.id,
    name:           a.name,
    logoUrl:        a.logoUrl || 'https://placehold.co/200x80.png',
    registeredName: a.registeredName || undefined,
    contactEmail:   a.contactEmail || undefined,
    contactPhone:   a.contactPhone || undefined,
    mainLocation:   a.mainLocation || undefined,
    branches:       a.branches || [],
    description:    a.description || undefined,
    createdAt:      a.createdAt?.toISOString(),
    updatedAt:      a.updatedAt?.toISOString(),
  };
}

export async function createAgency(d: CreateAgencyInput): Promise<string> {
  try {
    const agency = await prisma.agency.create({
      data: {
        name:           d.name,
        registeredName: d.registeredName || null,
        logoUrl:        d.logoUrl || null,
        contactEmail:   d.contactEmail || null,
        contactPhone:   d.contactPhone || null,
        mainLocation:   d.mainLocation || null,
        branches:       d.branches || [],
      },
    });
    return agency.id;
  } catch (e) { await logger().type('createAgency').data({ error: String(e), details: {} }).log(); throw new Error('Failed to create agency.'); }
}

export async function getAgencies({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agency[]> {
  try {
    const records = await prisma.agency.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
    return records.map(mapRecord);
  } catch (e) { await logger().type('getAgencies').data({ error: String(e), details: {} }).log(); return []; }
}

export async function getFeaturedAgencies(limit = 4): Promise<Agency[]> {
  try {
    const records = await prisma.agency.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return records.map(mapRecord);
  } catch (e) { await logger().type('getFeaturedAgencies').data({ error: String(e), details: {} }).log(); return []; }
}

export async function getPublicAgencyAccounts({
  limit = 100,
  offset = 0,
  filters = {},
}: {
  limit?: number;
  offset?: number;
  filters?: Filters;
} = {}): Promise<PublicAgencyAccount[]> {
  try {
    const records = await prisma.account.findMany({
      where: filter(filters),
      select: {
        id: true,
        neupId: true,
        displayName: true,
        displayImage: true,
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });

    const agencyIds = records.map((record) => record.id);
    const [agentCounts, propertyCounts] = agencyIds.length
      ? await Promise.all([
          prisma.agencyAgentMap.groupBy({
            by: ['agencyId'],
            where: {
              agencyId: { in: agencyIds },
              status: 'accepted',
            },
            _count: { agentId: true },
          }),
          prisma.property.groupBy({
            by: ['agency'],
            where: {
              agency: { in: agencyIds },
            },
            _count: { id: true },
          }),
        ])
      : [[], []];

    const agentCountMap = new Map(
      agentCounts.map((entry) => [entry.agencyId, entry._count.agentId]),
    );
    const propertyCountMap = new Map(
      propertyCounts
        .filter((entry): entry is typeof entry & { agency: string } => Boolean(entry.agency))
        .map((entry) => [entry.agency, entry._count.id]),
    );

    return records.map((record) =>
      mapPublicAgencyAccount(record, {
        agentCount: agentCountMap.get(record.id) ?? 0,
        propertyCount: propertyCountMap.get(record.id) ?? 0,
      }),
    );
  } catch (e) {
    await logger().type('getPublicAgencyAccounts').data({ error: String(e), details: {} }).log();
    return [];
  }
}

export async function getPublicAgencyAccountCount(filters: Filters = {}): Promise<number> {
  try {
    return await prisma.account.count({
      where: filter(filters),
    });
  } catch (e) {
    await logger().type('getPublicAgencyAccountCount').data({ error: String(e), details: {} }).log();
    return 0;
  }
}

export async function getPublicAccountProfileByNeupId(neupId: string): Promise<PublicAccountProfile | null> {
  try {
    const handle = normalizeHandle(neupId);
    if (!handle) return null;

    const record = await prisma.account.findUnique({
      where: { neupId: handle },
      select: {
        id: true,
        neupId: true,
        displayName: true,
        displayImage: true,
        accountType: true,
      },
    });

    if (record) {
      const counts = isAgencyLikeAccountType(record.accountType)
        ? await getAgencyCounts(record.id)
        : undefined;

      return mapPublicAccountProfile(record, counts);
    }
    return null;
  } catch (e) {
    await logger().type(`getPublicAccountProfileByNeupId ${neupId}`).data({ error: String(e), details: {} }).log();
    return null;
  }
}

export async function getPublicAgencyAccountByNeupId(neupId: string): Promise<PublicAgencyAccount | null> {
  const account = await getPublicAccountProfileByNeupId(neupId);
  if (!account || !isAgencyLikeAccountType(account.accountType)) {
    return null;
  }

  return account;
}

export async function getAgencyById(id: string): Promise<Agency | null> {
  try {
    const record = await prisma.agency.findUnique({ where: { id } });
    return record ? mapRecord(record) : null;
  } catch (e) { await logger().type(`getAgencyById ${id}`).data({ error: String(e), details: {} }).log(); return null; }
}

export async function updateAgency(id: string, d: UpdateAgencyInput): Promise<void> {
  try {
    await prisma.agency.update({
      where: { id },
      data: {
        name:           d.name,
        registeredName: d.registeredName || null,
        logoUrl:        d.logoUrl || null,
        contactEmail:   d.contactEmail || null,
        contactPhone:   d.contactPhone || null,
        mainLocation:   d.mainLocation || null,
        branches:       d.branches || [],
      },
    });
  } catch (e) { await logger().type(`updateAgency ${id}`).data({ error: String(e), details: {} }).log(); throw new Error('Failed to update agency.'); }
}

export async function deleteAgency(id: string): Promise<void> {
  try {
    await prisma.agency.delete({ where: { id } });
  } catch (e) { await logger().type(`deleteAgency ${id}`).data({ error: String(e), details: {} }).log(); throw new Error('Failed to delete agency.'); }
}
