'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import type { AgencyAgentMap, CreateAgencyAgentMapInput } from '@/types';

function mapRecord(record: any): AgencyAgentMap {
  return {
    id: record.id,
    agencyId: record.agencyId,
    agentId: record.agentId,
    isPrimary: Boolean(record.isPrimary),
  };
}

export async function createAgencyAgentMap(input: CreateAgencyAgentMapInput): Promise<AgencyAgentMap> {
  try {
    if (input.isPrimary) {
      await prisma.agencyAgentMap.updateMany({
        where: { agentId: input.agentId },
        data: { isPrimary: false },
      });
    }

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
        isPrimary: input.isPrimary ?? false,
      },
      update: {
        isPrimary: input.isPrimary ?? false,
      },
    });

    return mapRecord(record);
  } catch (e) {
    await logProblem(e, 'createAgencyAgentMap');
    throw new Error('Failed to create agency-agent mapping.');
  }
}

export async function getAgencyAgentMaps(): Promise<AgencyAgentMap[]> {
  try {
    const records = await prisma.agencyAgentMap.findMany({
      orderBy: [{ isPrimary: 'desc' }, { agencyId: 'asc' }, { agentId: 'asc' }],
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
      orderBy: [{ isPrimary: 'desc' }, { agencyId: 'asc' }],
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
      orderBy: [{ isPrimary: 'desc' }, { agentId: 'asc' }],
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
      where: { agentId, isPrimary: true },
      orderBy: [{ agencyId: 'asc' }],
    });
    return record ? mapRecord(record) : null;
  } catch (e) {
    await logProblem(e, `getPrimaryAgencyForAgent ${agentId}`);
    return null;
  }
}

export async function deleteAgencyAgentMap(id: string): Promise<void> {
  try {
    await prisma.agencyAgentMap.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `deleteAgencyAgentMap ${id}`);
    throw new Error('Failed to delete agency-agent mapping.');
  }
}
