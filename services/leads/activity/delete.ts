'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";

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
        await logger().type(`deleteLeadActivity ${id}`).data({ error: String(e), details: {} }).log();
        throw new Error('Failed to delete lead activity.');
    }
}
