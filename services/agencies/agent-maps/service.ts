'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import { getAccounts } from '@/services/accounts/list';
import type { Account, AgencyAgentMap, CreateAgencyAgentMapInput } from '@/types';

function mapRecord(record: any): AgencyAgentMap {
  return {
    id: record.id,
    agencyId: record.agencyId,
    agentId: record.agentId,
    status: record.status === 'accepted' ? 'accepted' : 'invited',
    isAdmin: Boolean(record.isAdmin),
  };
}

export async function createAgencyAgentMap(input: CreateAgencyAgentMapInput): Promise<AgencyAgentMap> {
  try {
    const record = await prisma.agencyAgentMap.upsert({
      where: {
        agencyId_agentId: {
          agencyId: input.agencyId,
          agentId: input.agentId,
        },
      },
      create: {
        agencyId: input.agencyId,
        agentId: input.agentId,
        status: input.status ?? 'invited',
        isAdmin: input.isAdmin ?? false,
      },
      update: {
        status: input.status ?? 'invited',
        isAdmin: input.isAdmin ?? false,
      },
    });

    return mapRecord(record);
  } catch (e) {
    await logger().type('createAgencyAgentMap').data({ error: String(e), details: {} }).log();
    throw new Error('Failed to create agency-agent invitation.');
  }
}

export async function getAgencyAgentMaps(): Promise<AgencyAgentMap[]> {
  try {
    const records = await prisma.agencyAgentMap.findMany({
      orderBy: [{ agencyId: 'asc' }, { agentId: 'asc' }],
    });
    return records.map(mapRecord);
  } catch (e) {
    await logger().type('getAgencyAgentMaps').data({ error: String(e), details: {} }).log();
    return [];
  }
}

export async function getAgencyAgentMapsByAgent(agentId: string): Promise<AgencyAgentMap[]> {
  try {
    const records = await prisma.agencyAgentMap.findMany({
      where: { agentId },
      orderBy: [{ agencyId: 'asc' }],
    });
    return records.map(mapRecord);
  } catch (e) {
    await logger().type(`getAgencyAgentMapsByAgent ${agentId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}

export async function getAgencyAgentMapsByAgency(agencyId: string): Promise<AgencyAgentMap[]> {
  try {
    const records = await prisma.agencyAgentMap.findMany({
      where: { agencyId },
      orderBy: [{ agentId: 'asc' }],
    });
    return records.map(mapRecord);
  } catch (e) {
    await logger().type(`getAgencyAgentMapsByAgency ${agencyId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}

export async function getPrimaryAgencyForAgent(agentId: string): Promise<AgencyAgentMap | null> {
  try {
    const record = await prisma.agencyAgentMap.findFirst({
      where: { agentId },
      orderBy: [{ status: 'desc' }, { agencyId: 'asc' }],
    });
    return record ? mapRecord(record) : null;
  } catch (e) {
    await logger().type(`getPrimaryAgencyForAgent ${agentId}`).data({ error: String(e), details: {} }).log();
    return null;
  }
}

export async function acceptAgencyAgentMap(id: string, isAdmin = false): Promise<AgencyAgentMap> {
  try {
    const record = await prisma.agencyAgentMap.update({
      where: { id },
      data: { status: 'accepted', isAdmin },
    });
    return mapRecord(record);
  } catch (e) {
    await logger().type(`acceptAgencyAgentMap ${id}`).data({ error: String(e), details: {} }).log();
    throw new Error('Failed to accept agency-agent invitation.');
  }
}

export async function getAgencyAgentAccountsByAgency(agencyId: string): Promise<Account[]> {
  try {
    const [links, accounts] = await Promise.all([
      getAgencyAgentMapsByAgency(agencyId),
      getAccounts(),
    ]);

    const agentIds = new Set(links.map((link) => link.agentId));
    return accounts.filter(
      (account) =>
        agentIds.has(account.id) &&
        !['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account.account_type),
    );
  } catch (e) {
    await logger().type(`getAgencyAgentAccountsByAgency ${agencyId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}

export async function deleteAgencyAgentMap(id: string): Promise<void> {
  try {
    await prisma.agencyAgentMap.delete({ where: { id } });
  } catch (e) {
    await logger().type(`deleteAgencyAgentMap ${id}`).data({ error: String(e), details: {} }).log();
    throw new Error('Failed to delete agency-agent invitation.');
  }
}
