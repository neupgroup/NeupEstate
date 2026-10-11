'use server';

import { revalidatePath } from 'next/cache';
import { createLeadActivity } from '@/services/leads/activity/create';
import { prisma } from '@neup/core/database/prisma';
import { getIdentity } from '@/services/neupid/get-identity';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { logger } from '@neup/logica/logger';

export async function addLeadActivityAction(data: {
    leadId: string;
    activityType: 'follow_up' | 'visit' | 'meeting' | 'remarks';
    activityOn?: string;
    followUpMethod?: 'phone call' | 'whatsapp' | 'email';
    propertyId?: string;
    remarks: string;
}): Promise<{ success: boolean; error?: string | null; activityId?: string | null }> {
    try {
        await requirePermission(PERMISSIONS.manage.selfLeadAddActivity);
        const identity = await getIdentity();
        if (!identity.authenticated) {
            throw new Error('Authentication required. Please sign in and try again.');
        }
        const actorId = identity.account.accountId;
        const account = await prisma.account.findUnique({
            where: { id: actorId },
            select: { displayName: true },
        });
        const activityBy = account?.displayName?.trim() || actorId;

        if (!data.leadId?.trim()) {
            return { success: false, error: 'Lead ID is required.', activityId: null };
        }

        const activityId = await createLeadActivity({
            leadId: data.leadId,
            activityType: data.activityType,
            activityOn: data.activityOn,
            followUpMethod: data.followUpMethod,
            propertyId: data.propertyId,
            remarks: data.remarks,
            activityBy,
        });

        revalidatePath(`/manage/leads/shared/${data.leadId}`);
        revalidatePath('/manage/leads/shared');
        revalidatePath('/manage/leads');
        return { success: true, error: null, activityId };
    } catch (error: any) {
        await logger().type('addLeadActivityAction').data({ error: String(error), details: {} }).log();
        return { success: false, error: error?.message ?? 'Failed to add lead activity.', activityId: null };
    }
}
