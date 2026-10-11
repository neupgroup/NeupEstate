'use server';

import { revalidatePath } from 'next/cache';
import { createLeadActivity } from '@/services/leads/activity/create';
import { getAccountById } from '@/services/accounts/id/lookup';
import { requireIdentity } from '@/services/properties/action-helpers';
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
        const actorId = await requireIdentity();
        const account = await getAccountById(actorId);
        const activityBy = account?.display_name?.trim() || actorId;

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
