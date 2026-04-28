'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import { LeadType, LeadPriority } from '@prisma/client';

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
        return await prisma.crmClient.findMany({
            where: {
                OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName:  { contains: q, mode: 'insensitive' } },
                    { contact:   { path: ['phone'], string_contains: q } },
                    { contact:   { path: ['email'], string_contains: q } },
                ],
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
        });
    } catch (e) {
        await logProblem(e, 'searchClients');
        return [];
    }
}

export async function saveClient(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    source?: string;
}): Promise<string> {
    try {
        const c = await prisma.crmClient.create({
            data: {
                firstName: data.firstName,
                lastName:  data.lastName,
                source:    data.source || null,
                contact: {
                    email: data.email || null,
                    phone: data.phone || null,
                },
            },
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
            const c = await prisma.crmClient.create({
                data: {
                    firstName: data.firstName!,
                    lastName:  data.lastName!,
                    source:    data.source || null,
                    contact: {
                        email: data.email || null,
                        phone: data.phone || null,
                    },
                },
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

export async function getLeads() {
    try {
        return await prisma.clientLead.findMany({
            include: { client: true },
            orderBy: { createdAt: 'desc' },
        });
    } catch (e) {
        await logProblem(e, 'getLeads');
        return [];
    }
}

export async function getLeadById(id: string) {
    try {
        return await prisma.clientLead.findUnique({
            where: { id },
            include: { client: true, activities: { orderBy: { activityOn: 'desc' } } },
        });
    } catch (e) {
        await logProblem(e, `getLeadById ${id}`);
        return null;
    }
}

export async function getClients() {
    try {
        return await prisma.crmClient.findMany({
            orderBy: { createdAt: 'desc' },
            include: { leads: true },
        });
    } catch (e) {
        await logProblem(e, 'getClients');
        return [];
    }
}

export async function getClientById(id: string) {
    try {
        return await prisma.crmClient.findUnique({
            where: { id },
            include: {
                leads: {
                    include: { activities: { orderBy: { activityOn: 'desc' } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
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
                include: { client: true },
            }),
            prisma.leadActivity.findMany({
                where: { leadId },
                orderBy: { activityOn: 'desc' },
            }),
        ]);
        return { lead, activities };
    } catch (e) {
        await logProblem(e, `getLeadActivity ${leadId}`);
        return { lead: null, activities: [] };
    }
}
