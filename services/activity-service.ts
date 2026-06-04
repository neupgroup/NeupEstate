

'use server';

import { prisma } from '@/logica/core/prisma';
import type { CreateUserActivityInput } from '@/types';
import { logProblem } from './problem-service';

export async function logActivity(activityData: CreateUserActivityInput): Promise<string> {
    try {
        if (!activityData.userId) {
            return '';
        }

        const activity = await prisma.activity.create({
            data: {
                trackerId: activityData.userId,
                title: activityData.activity,
                details: {
                    page: activityData.page ?? null,
                    propertyId: activityData.propertyId ?? null,
                    duration: activityData.duration ?? null,
                },
                activityOn: new Date(activityData.activityOn),
                ipAddress: 'unknown',
            },
        });
        return activity.id;
    } catch (error: any) {
        // Log the error but don't crash the user-facing operation
        await logProblem(error, 'logActivity');
        return '';
    }
}

/**
 * Updates the last accessed time and IP for a given account.
 * @param accountId The ID of the account to update.
 * @param ipAddress The IP address from the current request.
 */
export async function updateAccountAccessInfo(accountId: string, ipAddress: string): Promise<void> {
    try {
        await prisma.account.update({
            where: { id: accountId },
            data: {
                accessedOn: new Date(),
            },
        });
    } catch (error) {
        await logProblem(error, 'updateAccountAccessInfo');
    }
}
