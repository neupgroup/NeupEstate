'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import { LeadType, LeadPriority, Prisma } from '@prisma/client';

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

async function replaceClientContacts(tx: Prisma.TransactionClient, clientId: string, contacts: Array<{ type: string; value?: string | null }>) {
    await tx.clientContact.deleteMany({
        where: {
            clientId,
            type: { in: contacts.map((contact) => contact.type) },
        },
    });

    const nextContacts = contacts
        .map((contact) => ({ type: contact.type, value: contact.value?.trim() || '' }))
        .filter((contact) => contact.value);

    if (!nextContacts.length) return;

    await tx.clientContact.createMany({
        data: nextContacts.map((contact) => ({
            clientId,
            type: contact.type,
            value: contact.value,
        })),
    });
}

export interface CreateLeadInput {
    existingClientId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    source?: string;
    type: LeadType;
    priority: LeadPriority;
    leadOwner?: string;
    requirement?: Record<string, any>;
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

export async function saveClient(data: {
    accountId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    source?: string;
}): Promise<string> {
    try {
        const c = await prisma.$transaction(async (tx) => {
            const created = await tx.crmClient.create({
                data: {
                    firstName: data.firstName,
                    lastName:  data.lastName,
                    source:    data.source || null,
                    contact: {},
                },
            });

            await replaceClientContacts(tx, created.id, [
                { type: 'email', value: data.email },
                { type: 'phone', value: data.phone },
            ]);

            if (data.accountId) {
                await tx.clientLink.create({
                    data: {
                        trackerId: data.accountId,
                        clientId: created.id,
                    },
                });
            }

            return created;
        });
        return c.id;
    } catch (e) {
        await logProblem(e, 'saveClient');
        throw new Error('Failed to save client.');
    }
}

export async function createLead(data: CreateLeadInput): Promise<string> {
    try {
        let clientId = data.existingClientId;

        if (!clientId) {
            const c = await prisma.$transaction(async (tx) => {
                const created = await tx.crmClient.create({
                    data: {
                        firstName: data.firstName!,
                        lastName:  data.lastName!,
                        source:    data.source || null,
                        contact: {},
                    },
                });

                await replaceClientContacts(tx, created.id, [
                    { type: 'email', value: data.email },
                    { type: 'phone', value: data.phone },
                ]);

                return created;
            });
            clientId = c.id;
        }

        const lead = await prisma.clientLead.create({
            data: {
                clientId,
                type:        data.type,
                priority:    data.priority,
                leadOwner:   data.leadOwner || null,
                requirement: data.requirement ?? {},
            },
        });

        return lead.id;
    } catch (e) {
        await logProblem(e, 'createLead');
        throw new Error('Failed to create lead.');
    }
}

export async function getLeads(accountId: string) {
    try {
        const leads = await prisma.clientLead.findMany({
            where: { leadOwner: accountId },
            include: { client: { include: CLIENT_INCLUDE } },
            orderBy: { createdAt: 'desc' },
        });
        return leads.map((lead) => ({
            ...lead,
            client: normalizeClient(lead.client),
        }));
    } catch (e) {
        await logProblem(e, 'getLeads');
        return [];
    }
}

export async function getLeadById(id: string) {
    try {
        const lead = await prisma.clientLead.findUnique({
            where: { id },
            include: { client: { include: CLIENT_INCLUDE }, activities: { orderBy: { activityOn: 'desc' } } },
        });
        return lead ? { ...lead, client: normalizeClient(lead.client) } : null;
    } catch (e) {
        await logProblem(e, `getLeadById ${id}`);
        return null;
    }
}

export async function getClients(accountId: string) {
    try {
        const clients = await prisma.crmClient.findMany({
            where: {
                OR: [
                    { leads: { some: { leadOwner: accountId } } },
                    { links: { some: { trackerId: accountId } } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                leads: { where: { leadOwner: accountId } },
                contacts: true,
            },
        });
        return clients.map(normalizeClient);
    } catch (e) {
        await logProblem(e, 'getClients');
        return [];
    }
}

export async function getClientById(id: string, accountId: string) {
    try {
        const client = await prisma.crmClient.findFirst({
            where: {
                id,
                OR: [
                    { leads: { some: { leadOwner: accountId } } },
                    { links: { some: { trackerId: accountId } } },
                ],
            },
            include: {
                contacts: true,
                leads: {
                    where: { leadOwner: accountId },
                    include: { activities: { orderBy: { activityOn: 'desc' } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        return client ? normalizeClient(client) : null;
    } catch (e) {
        await logProblem(e, `getClientById ${id}`);
        return null;
    }
}

export async function getClientActivity(clientId: string) {
    try {
        const leads = await prisma.clientLead.findMany({
            where: { clientId },
            select: { id: true, type: true, priority: true },
        });
        const leadIds = leads.map((l) => l.id);
        const activities = await prisma.leadActivity.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { activityOn: 'desc' },
        });
        return { leads, activities };
    } catch (e) {
        await logProblem(e, `getClientActivity ${clientId}`);
        return { leads: [], activities: [] };
    }
}

export async function getLeadActivity(leadId: string) {
    try {
        const [lead, activities] = await Promise.all([
            prisma.clientLead.findUnique({
                where: { id: leadId },
                include: { client: { include: CLIENT_INCLUDE } },
            }),
            prisma.leadActivity.findMany({
                where: { leadId },
                orderBy: { activityOn: 'desc' },
            }),
        ]);
        return { lead: lead ? { ...lead, client: normalizeClient(lead.client) } : null, activities };
    } catch (e) {
        await logProblem(e, `getLeadActivity ${leadId}`);
        return { lead: null, activities: [] };
    }
}

export interface MergeClientsInput {
    keepClientId: string;
    dropClientId: string;
    mergedData: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        source?: string;
    };
}

export async function mergeClients(data: MergeClientsInput): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            // Move all leads from dropped client to kept client
            await tx.clientLead.updateMany({
                where: { clientId: data.dropClientId },
                data:  { clientId: data.keepClientId },
            });

            // Move all links from dropped client to kept client
            await tx.clientLink.updateMany({
                where: { clientId: data.dropClientId },
                data:  { clientId: data.keepClientId },
            });

            await tx.clientContact.updateMany({
                where: { clientId: data.dropClientId },
                data: { clientId: data.keepClientId },
            });

            // Update kept client with merged data
            await tx.crmClient.update({
                where: { id: data.keepClientId },
                data: {
                    firstName: data.mergedData.firstName,
                    lastName:  data.mergedData.lastName,
                    source:    data.mergedData.source || null,
                    contact: {},
                },
            });

            await replaceClientContacts(tx, data.keepClientId, [
                { type: 'email', value: data.mergedData.email },
                { type: 'phone', value: data.mergedData.phone },
            ]);

            // Delete the dropped client
            await tx.crmClient.delete({ where: { id: data.dropClientId } });
        });
    } catch (e) {
        await logProblem(e, 'mergeClients');
        throw new Error('Failed to merge clients.');
    }
}
