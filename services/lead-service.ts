'use server';

import { prisma } from '@/core/database/prisma';
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

function normalizeLead<T extends { client: any }>(lead: T) {
    return {
        ...lead,
        client: normalizeClient(lead.client),
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
    assignedTo?: string;
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

        const lead = await prisma.sharedLead.create({
            data: {
                clientId,
                type:        data.type,
                priority:    data.priority,
                leadOwner:   data.assignedTo || null,
                requirement: data.requirement ?? {},
            },
        });

        return lead.id;
    } catch (e) {
        await logProblem(e, 'createLead');
        throw new Error('Failed to create lead.');
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

export async function getLeadActivity(leadId: string) {
    try {
        const [lead, activities] = await Promise.all([
            prisma.sharedLead.findUnique({
                where: { id: leadId },
                include: { client: { include: CLIENT_INCLUDE } },
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

export async function getUnifiedLeads() {
    return getBaseLeads();
}

export async function getUnifiedClientById(id: string) {
    return getBaseClientById(id);
}
