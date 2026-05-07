'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type {
  AgencyCustomization,
  AgencyCustomizationRule,
  AgencyCustomizeFor,
  AgencyMap,
  CreateAgencyCustomizationInput,
  CreateAgencyMapInput,
} from '@/types';
import { AgencyCustomizationRuleSchema } from '@/types';

// ─── AgencyMap ────────────────────────────────────────────────────────────────

function mapAgencyMapRecord(r: any): AgencyMap {
  return {
    id:              r.id,
    agencyAccountId: r.agencyAccountId,
    accountId:       r.accountId,
    role:            r.role,
    lockIn:          r.lockIn,
  };
}

export async function createAgencyMap(d: CreateAgencyMapInput): Promise<AgencyMap> {
  try {
    const record = await prisma.agencyMap.create({
      data: {
        agencyAccountId: d.agencyAccountId,
        accountId:       d.accountId,
        role:            d.role,
        lockIn:          d.lockIn ?? false,
      },
    });
    return mapAgencyMapRecord(record);
  } catch (e) {
    await logProblem(e, 'createAgencyMap');
    throw new Error('Failed to create agency map entry.');
  }
}

export async function getAgencyMapByAccount(accountId: string): Promise<AgencyMap | null> {
  try {
    const record = await prisma.agencyMap.findFirst({
      where: { accountId },
    });
    return record ? mapAgencyMapRecord(record) : null;
  } catch (e) {
    await logProblem(e, `getAgencyMapByAccount ${accountId}`);
    return null;
  }
}

export async function getAgencyMapsByAgency(agencyAccountId: string): Promise<AgencyMap[]> {
  try {
    const records = await prisma.agencyMap.findMany({
      where: { agencyAccountId },
      orderBy: { role: 'asc' },
    });
    return records.map(mapAgencyMapRecord);
  } catch (e) {
    await logProblem(e, `getAgencyMapsByAgency ${agencyAccountId}`);
    return [];
  }
}

export async function deleteAgencyMap(id: string): Promise<void> {
  try {
    await prisma.agencyMap.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `deleteAgencyMap ${id}`);
    throw new Error('Failed to delete agency map entry.');
  }
}

// ─── AgencyCustomization ──────────────────────────────────────────────────────

function mapCustomizationRecord(r: any): AgencyCustomization {
  const rule = AgencyCustomizationRuleSchema.safeParse(r.customization);
  return {
    id:            r.id,
    agencyId:      r.agencyId,
    customizeFor:  r.customizeFor,
    customization: rule.success ? rule.data : { required: [], optional: [] },
    createdAt:     r.createdAt?.toISOString?.() ?? String(r.createdAt),
    updatedAt:     r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
  };
}

export async function upsertAgencyCustomization(d: CreateAgencyCustomizationInput): Promise<AgencyCustomization> {
  try {
    const record = await prisma.agencyCustomization.upsert({
      where: {
        agencyId_customizeFor: {
          agencyId:     d.agencyId,
          customizeFor: d.customizeFor,
        },
      },
      create: {
        agencyId:      d.agencyId,
        customizeFor:  d.customizeFor,
        customization: d.customization as any,
      },
      update: {
        customization: d.customization as any,
      },
    });
    return mapCustomizationRecord(record);
  } catch (e) {
    await logProblem(e, 'upsertAgencyCustomization');
    throw new Error('Failed to save agency customization.');
  }
}

export async function getAgencyCustomization(
  agencyId: string,
  customizeFor: AgencyCustomizeFor,
): Promise<AgencyCustomization | null> {
  try {
    const record = await prisma.agencyCustomization.findUnique({
      where: {
        agencyId_customizeFor: { agencyId, customizeFor },
      },
    });
    return record ? mapCustomizationRecord(record) : null;
  } catch (e) {
    await logProblem(e, `getAgencyCustomization ${agencyId}/${customizeFor}`);
    return null;
  }
}

export async function getAgencyCustomizationsForAgency(agencyId: string): Promise<AgencyCustomization[]> {
  try {
    const records = await prisma.agencyCustomization.findMany({
      where: { agencyId },
    });
    return records.map(mapCustomizationRecord);
  } catch (e) {
    await logProblem(e, `getAgencyCustomizationsForAgency ${agencyId}`);
    return [];
  }
}

export async function deleteAgencyCustomization(id: string): Promise<void> {
  try {
    await prisma.agencyCustomization.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `deleteAgencyCustomization ${id}`);
    throw new Error('Failed to delete agency customization.');
  }
}

/**
 * Convenience: given an accountId (the logged-in user), find their agency
 * membership and return the customization rule for the given target.
 * Returns null if the user has no agency mapping or no customization is set.
 */
export async function getCustomizationForAccount(
  accountId: string,
  customizeFor: AgencyCustomizeFor,
): Promise<AgencyCustomizationRule | null> {
  try {
    const mapping = await prisma.agencyMap.findFirst({ where: { accountId } });
    if (!mapping) return null;

    const record = await prisma.agencyCustomization.findUnique({
      where: {
        agencyId_customizeFor: {
          agencyId:     mapping.agencyAccountId,
          customizeFor,
        },
      },
    });
    if (!record) return null;

    const parsed = AgencyCustomizationRuleSchema.safeParse(record.customization);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    await logProblem(e, `getCustomizationForAccount ${accountId}/${customizeFor}`);
    return null;
  }
}
