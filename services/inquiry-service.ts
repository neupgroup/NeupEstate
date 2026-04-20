
'use server';

import { prisma } from '@/lib/prisma';
import type { Inquiry, CreateInquiryFormValues, InquiryStatus } from '@/types';
import { getPropertyById } from './property-service';
import { logProblem } from './problem-service';

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
