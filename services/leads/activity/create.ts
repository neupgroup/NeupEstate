'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

// ::neup.documentation::lead-activity-create-service
// ::private
//
// Creates activity events for shared leads.
//
// ::private end
// ::end

export type LeadActivityType = 'follow_up' | 'visit' | 'meeting' | 'remarks';

export interface CreateLeadActivityInput {
    leadId: string;
    activityType: LeadActivityType;
    activityOn?: string;
    followUpMethod?: 'phone call' | 'whatsapp' | 'email';
    propertyId?: string;
    remarks: string;
    activityBy: string;
}

export async function createLeadActivity(input: CreateLeadActivityInput): Promise<string> {
    try {
        const propertyTitle = input.propertyId
            ? await prisma.property.findUnique({
                where: { id: input.propertyId },
                select: { title: true },
            })
            : null;

        const activity = await prisma.leadActivity.create({
            data: {
                leadId: input.leadId,
                activityBy: input.activityBy,
                activityOn: input.activityOn ? new Date(input.activityOn) : new Date(),
                data: {
                    activityType: input.activityType,
                    followUpMethod: input.followUpMethod ?? null,
                    propertyId: input.propertyId ?? null,
                    propertyTitle: propertyTitle?.title ?? null,
                    remarks: input.remarks.trim(),
                },
            },
        });

        return activity.id;
    } catch (e) {
        await logProblem(e, `createLeadActivity ${input.leadId}`);
        throw new Error('Failed to create lead activity.');
    }
}
