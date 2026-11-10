'use server';

import { prisma } from '@neup/core/database/prisma';

// ::neup.documentation::lead-activity-delete-service
// ::private
//
// Deletes activity events from shared leads.
//
// ::private end
// ::end

export async function deleteLeadActivity(id: string): Promise<string> {
    try {
        await prisma.leadActivity.delete({
            where: { id },
        });

        return id;
    } catch (e) {
        throw new Error('Failed to delete lead activity.');
    }
}
