
'use server';

import { getDbAdapter } from '@/lib/database';
import type { Agency, CreateAgencyInput, UpdateAgencyInput } from '@/types';

export async function createAgency(agencyData: CreateAgencyInput): Promise<string> {
    const db = getDbAdapter();
    return db.createAgency(agencyData);
}

export async function getAgencies({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agency[]> {
    const db = getDbAdapter();
    return db.getAgencies({ limit, offset });
}

export async function getFeaturedAgencies(limit = 4): Promise<Agency[]> {
    const db = getDbAdapter();
    return db.getFeaturedAgencies(limit);
}

export async function getAgencyById(id: string): Promise<Agency | null> {
    const db = getDbAdapter();
    return db.getAgencyById(id);
}

export async function updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void> {
    const db = getDbAdapter();
    return db.updateAgency(id, agencyData);
}

export async function deleteAgency(agencyId: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteAgency(agencyId);
}
