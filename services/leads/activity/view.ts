'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

// ::neup.documentation::lead-activity-view-service
// ::private
//
// Reads activity timelines for shared leads.
//
// ::private end
// ::end

const CLIENT_INCLUDE = {
    contacts: true,
} as const;

function getLegacyContact(contact: any): { email?: string | null; phone?: string | null } {
    return contact && typeof contact === 'object' ? contact : {};
}

function pickClientContact(
    contacts: Array<{ type: string; value: string }> = [],
    type: string,
    fallback?: string | null
): string | null {
    const match = contacts.find((contact) => contact.type.toLowerCase() === type.toLowerCase() && contact.value?.trim());
    return match?.value?.trim() || fallback || null;
}

function normalizeClient<T extends { contact?: any; contacts?: Array<{ type: string; value: string }>; firstName: string; lastName: string }>(client: T) {
    const legacy = getLegacyContact(client.contact);
    return {
        ...client,
        contact: {
            email: pickClientContact(client.contacts, 'email', legacy.email),
            phone: pickClientContact(client.contacts, 'phone', legacy.phone),
        },
    };
}

function normalizeLead<T extends { client?: any; baseLead?: any }>(lead: T) {
    const client = lead.client ?? lead.baseLead;
    return {
        ...lead,
        client: normalizeClient(client),
    };
}

export async function getLeadActivity(leadId: string) {
    try {
        const [lead, activities] = await Promise.all([
            prisma.sharedLeads.findUnique({
                where: { id: leadId },
                include: { baseLead: { include: CLIENT_INCLUDE } },
            }),
            prisma.leadActivity.findMany({
                where: { leadId },
                orderBy: { activityOn: 'desc' },
            }),
        ]);
        return { lead: lead ? normalizeLead(lead) : null, activities };
    } catch (e) {
        await logProblem(e, `getLeadActivity ${leadId}`);
        return { lead: null, activities: [] };
    }
}
