'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import { getAccounts } from './account-service';
import type { Account, AgencyAgentMap, CreateAgencyAgentMapInput } from '@/types';

function mapRecord(record: any): AgencyAgentMap {
  return {
    id: record.id,
    agencyId: record.agencyId,
    agentId: record.agentId,
    status: record.status === 'invited' ? 'invited' : 'invited',
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
      },
      update: {
        status: input.status ?? 'invited',
      },
    });

    return mapRecord(record);
  } catch (e) {
    await logProblem(e, 'createAgencyAgentMap');
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
    await logProblem(e, 'getAgencyAgentMaps');
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
    await logProblem(e, `getAgencyAgentMapsByAgent ${agentId}`);
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
    await logProblem(e, `getAgencyAgentMapsByAgency ${agencyId}`);
    return [];
  }
}

export async function getPrimaryAgencyForAgent(agentId: string): Promise<AgencyAgentMap | null> {
  try {
    const record = await prisma.agencyAgentMap.findFirst({
      where: { agentId },
      orderBy: [{ agencyId: 'asc' }],
    });
    return record ? mapRecord(record) : null;
  } catch (e) {
    await logProblem(e, `getPrimaryAgencyForAgent ${agentId}`);
    return null;
  }
}

export async function getAgencyAgentAccountsByAgency(agencyId: string): Promise<Account[]> {
  try {
    const [links, accounts] = await Promise.all([
      getAgencyAgentMapsByAgency(agencyId),
      getAccounts(),
    ]);

    const agentIds = new Set(links.map((link) => link.agentId));
    return accounts.filter((account) => agentIds.has(account.id) && account.account_type !== 'brand');
  } catch (e) {
    await logProblem(e, `getAgencyAgentAccountsByAgency ${agencyId}`);
    return [];
  }
}

export async function deleteAgencyAgentMap(id: string): Promise<void> {
  try {
    await prisma.agencyAgentMap.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `deleteAgencyAgentMap ${id}`);
    throw new Error('Failed to delete agency-agent invitation.');
  }
}
