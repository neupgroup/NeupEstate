
/*
::neup.documentation::inquiry-service

Inquiry persistence helpers for site forms and bridge-originated inquiry writes.

::private

`createBridgeInquiry()` accepts a looser bridge payload than the site form.
The bridge API only requires a resolvable property plus either `phone` or
`email`, while the current database schema still requires non-null `name`,
`email`, and `question` columns. Missing bridge values are normalized to empty
strings or a fallback display name before insert so the route can remain
backward compatible without changing the table shape.

::private end
::end
*/

import { prisma } from '@/core/database/prisma';
import type { Inquiry, CreateInquiryFormValues, InquiryStatus } from '@/types';
import { getPropertyById } from './property';
import { logProblem } from './problem-service';

export class InquiryServiceError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'InquiryServiceError';
        this.status = status;
    }
}

export interface CreateBridgeInquiryInput {
    propertyId: string;
    phone?: string;
    email?: string;
    message?: string;
    name?: string;
    accountId?: string;
}

export async function createInquiry(data: CreateInquiryFormValues): Promise<string> {
    try {
        // Fetch property to denormalize some data for easier display
        const property = await getPropertyById(data.propertyId);
        if (!property) {
            throw new Error(`Property with ID ${data.propertyId} not found.`);
        }

        const inquiryData = {
            ...data,
            propertyTitle: property.title,
            agentName: property.listingAgent || property.agency.name, // Use listing agent or fall back to agency name
            status: 'new',
        };

        const inquiry = await prisma.inquiry.create({
            data: {
                propertyId: inquiryData.propertyId,
                propertyTitle: inquiryData.propertyTitle,
                agentName: inquiryData.agentName || null,
                name: inquiryData.name,
                email: inquiryData.email,
                phone: inquiryData.phone || null,
                question: inquiryData.question,
                status: inquiryData.status,
            },
        });
        return inquiry.id;
    } catch (error) {
        await logProblem(error, 'createInquiry');
        throw new Error('Failed to submit inquiry.');
    }
}

export async function createBridgeInquiry(input: CreateBridgeInquiryInput): Promise<string> {
    const propertyId = input.propertyId.trim();
    const phone = input.phone?.trim() || undefined;
    const email = input.email?.trim() || undefined;
    const message = input.message?.trim() || '';
    const name = input.name?.trim() || 'Unknown';

    if (!propertyId) {
        throw new InquiryServiceError('Property is required.', 400);
    }

    if (!phone && !email) {
        throw new InquiryServiceError('Provide at least phone or email.', 400);
    }

    try {
        const property = await getPropertyById(propertyId, { includeInactive: true });
        if (!property) {
            throw new InquiryServiceError('Property not found.', 404);
        }

        const inquiry = await prisma.inquiry.create({
            data: {
                propertyId,
                propertyTitle: property.title,
                agentName: property.listingAgent || property.agency.name || null,
                name,
                email: email || '',
                phone: phone || null,
                question: message,
                status: 'new',
            },
        });

        return inquiry.id;
    } catch (error) {
        if (error instanceof InquiryServiceError) {
            throw error;
        }

        await logProblem(error, `createBridgeInquiry ${propertyId}${input.accountId ? ` account:${input.accountId}` : ''}`);
        throw new InquiryServiceError('Failed to submit inquiry.', 500);
    }
}

export async function getInquiries({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Inquiry[]> {
    try {
        const inquiries = await prisma.inquiry.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return inquiries.map((inquiry) => ({
            id: inquiry.id,
            propertyId: inquiry.propertyId,
            propertyTitle: inquiry.propertyTitle,
            agentName: inquiry.agentName || undefined,
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone || undefined,
            question: inquiry.question,
            createdAt: inquiry.createdAt.toISOString(),
            status: inquiry.status as InquiryStatus,
        }));
    } catch (error) {
        await logProblem(error, 'getInquiries');
        return [];
    }
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
    try {
        await prisma.inquiry.update({
            where: { id },
            data: { status },
        });
    } catch (error) {
        await logProblem(error, `updateInquiryStatus (ID: ${id})`);
        throw new Error('Failed to update inquiry status.');
    }
}
