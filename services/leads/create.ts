'use server';

import { prisma } from '@/core/database/prisma';
import { LeadPriority, LeadType, Prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

// ::neup.documentation::lead-create-service
// ::private
//
// Creates base lead contacts and shared lead records.
//
// ::private end
// ::end

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
            const created = await tx.baseLead.create({
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
                const created = await tx.baseLead.create({
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
