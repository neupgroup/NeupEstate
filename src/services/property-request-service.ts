

'use server';

import { prisma } from '@/lib/prisma';
import type { PropertyRequest, CreatePropertyRequestFormValues, CreateInquiryFormValues, InquiryStatus } from '@/types';
import { logProblem } from './problem-service';
import { createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from './inquiry-service';


export async function createPropertyRequest(data: CreatePropertyRequestFormValues): Promise<string> {

    try {
        const request = await prisma.propertyRequest.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                propertyType: data.propertyType,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                budget: data.budget,
                remarks: data.remarks,
                status: 'new',
            },
        });
        return request.id;
    } catch (error) {
        await logProblem(error, 'createPropertyRequest');
        throw new Error('Failed to submit property request.');
    }
}

export async function getPropertyRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<PropertyRequest[]> {

    try {
        const requests = await prisma.propertyRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return requests.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        await logProblem(error, 'getPropertyRequests');
        return [];
    }
}

export async function createInquiry(data: CreateInquiryFormValues): Promise<string> {
    return createInquiryService(data);
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
    return updateInquiryStatusService(id, status);
}
