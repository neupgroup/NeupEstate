'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

// ::neup.documentation::lead-search-service
// ::private
//
// Reads base leads, shared leads, lead activity, and CRM client search results.
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

function normalizeLead<T extends { client: any }>(lead: T) {
    return {
        ...lead,
        client: normalizeClient(lead.client),
    };
}

export async function searchClients(query: string) {
    try {
        const q = query.trim();
        if (!q) return [];
        const clients = await prisma.crmClient.findMany({
            where: {
                OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName:  { contains: q, mode: 'insensitive' } },
                    { contacts:  { some: { value: { contains: q, mode: 'insensitive' } } } },
                    { contact:   { path: ['phone'], string_contains: q } },
                    { contact:   { path: ['email'], string_contains: q } },
                ],
            },
            include: CLIENT_INCLUDE,
            take: 10,
            orderBy: { createdAt: 'desc' },
        });
        return clients.map(normalizeClient);
    } catch (e) {
        await logProblem(e, 'searchClients');
        return [];
    }
}

export async function getBaseLeads() {
    try {
        const leads = await prisma.clientLead.findMany({
            include: { client: { include: CLIENT_INCLUDE } },
            orderBy: { createdAt: 'desc' },
        });
        return leads.map(normalizeLead);
    } catch (e) {
        await logProblem(e, 'getBaseLeads');
        return [];
    }
}

export async function getSharedLeads() {
    try {
        const leads = await prisma.sharedLead.findMany({
            include: { client: { include: CLIENT_INCLUDE } },
            orderBy: { createdAt: 'desc' },
        });
        return leads.map(normalizeLead);
    } catch (e) {
        await logProblem(e, 'getSharedLeads');
        return [];
    }
}

export async function getMyLeads(accountId: string) {
    try {
        const leads = await prisma.sharedLead.findMany({
            where: { leadOwner: accountId },
            include: { client: { include: CLIENT_INCLUDE } },
            orderBy: { createdAt: 'desc' },
        });
        return leads.map(normalizeLead);
    } catch (e) {
        await logProblem(e, 'getMyLeads');
        return [];
    }
}

export async function getBaseClientById(id: string) {
    try {
        const client = await prisma.crmClient.findUnique({
            where: { id },
            include: {
                contacts: true,
                leads: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        return client ? { ...normalizeClient(client), leads: client.leads } : null;
    } catch (e) {
        await logProblem(e, `getBaseClientById ${id}`);
        return null;
    }
}

export async function getLeadById(id: string) {
    try {
        const lead = await prisma.sharedLead.findUnique({
            where: { id },
            include: { client: { include: CLIENT_INCLUDE }, activities: { orderBy: { activityOn: 'desc' } } },
        });
        return lead ? normalizeLead(lead) : null;
    } catch (e) {
        await logProblem(e, `getLeadById ${id}`);
        return null;
    }
}

export async function getUnifiedLeads() {
    return getBaseLeads();
}

export async function getUnifiedClientById(id: string) {
    return getBaseClientById(id);
}
