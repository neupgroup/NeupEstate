'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import type { Agency, CreateAgencyInput, UpdateAgencyInput } from '@/types';

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
  } catch (e) { await logProblem(e, 'createAgency'); throw new Error('Failed to create agency.'); }
}

export async function getAgencies({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agency[]> {
  try {
    const records = await prisma.agency.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getAgencies'); return []; }
}

export async function getFeaturedAgencies(limit = 4): Promise<Agency[]> {
  try {
    const records = await prisma.agency.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getFeaturedAgencies'); return []; }
}

export async function getAgencyById(id: string): Promise<Agency | null> {
  try {
    const record = await prisma.agency.findUnique({ where: { id } });
    return record ? mapRecord(record) : null;
  } catch (e) { await logProblem(e, `getAgencyById ${id}`); return null; }
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
  } catch (e) { await logProblem(e, `updateAgency ${id}`); throw new Error('Failed to update agency.'); }
}

export async function deleteAgency(id: string): Promise<void> {
  try {
    await prisma.agency.delete({ where: { id } });
  } catch (e) { await logProblem(e, `deleteAgency ${id}`); throw new Error('Failed to delete agency.'); }
}
