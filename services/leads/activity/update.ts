'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import type { LeadActivityType } from './create';

// ::neup.documentation::lead-activity-update-service
// ::private
//
// Updates activity event details for shared leads.
//
// ::private end
// ::end

export interface UpdateLeadActivityInput {
    activityType?: LeadActivityType;
    activityOn?: string;
    followUpMethod?: 'phone call' | 'whatsapp' | 'email' | null;
    propertyId?: string | null;
    remarks?: string;
}

export async function updateLeadActivity(id: string, input: UpdateLeadActivityInput): Promise<string> {
    try {
        const current = await prisma.leadActivity.findUnique({
            where: { id },
            select: { data: true },
        });

        if (!current) {
            throw new Error('Lead activity not found.');
        }

        const currentData = current.data && typeof current.data === 'object' && !Array.isArray(current.data)
            ? current.data as Record<string, any>
            : {};
        const propertyTitle = input.propertyId
            ? await prisma.property.findUnique({
                where: { id: input.propertyId },
                select: { title: true },
            })
            : null;

        await prisma.leadActivity.update({
            where: { id },
            data: {
                activityOn: input.activityOn ? new Date(input.activityOn) : undefined,
                data: {
                    ...currentData,
                    activityType: input.activityType ?? currentData.activityType ?? null,
                    followUpMethod: input.followUpMethod !== undefined ? input.followUpMethod : currentData.followUpMethod ?? null,
                    propertyId: input.propertyId !== undefined ? input.propertyId : currentData.propertyId ?? null,
                    propertyTitle: input.propertyId !== undefined ? propertyTitle?.title ?? null : currentData.propertyTitle ?? null,
                    remarks: input.remarks !== undefined ? input.remarks.trim() : currentData.remarks ?? '',
                },
            },
        });

        return id;
    } catch (e) {
        await logProblem(e, `updateLeadActivity ${id}`);
        throw new Error('Failed to update lead activity.');
    }
}
