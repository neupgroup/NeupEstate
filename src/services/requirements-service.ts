
'use server';

import { getDbAdapter } from '@/lib/database';
import type { Requirement, CreateRequirementFormValues } from '@/types';

export async function createRequirement(data: CreateRequirementFormValues): Promise<string> {
    const db = getDbAdapter();
    return db.createRequirement(data);
}

export async function getRequirementById(id: string): Promise<Requirement | null> {
    const db = getDbAdapter();
    return db.getRequirementById(id);
}

export async function getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
    const db = getDbAdapter();
    return db.getRequirementByUserId(userId);
}

export async function updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
    const db = getDbAdapter();
    return db.updateRequirement(id, data);
}
