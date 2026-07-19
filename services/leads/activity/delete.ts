'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

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
        await logProblem(e, `deleteLeadActivity ${id}`);
        throw new Error('Failed to delete lead activity.');
    }
}
