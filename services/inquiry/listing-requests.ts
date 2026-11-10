

'use server';

import { prisma } from '@neup/core/database/prisma';
import type { ListingRequest, CreateListingRequestFormValues } from '@/types';


export async function createListingRequest(data: CreateListingRequestFormValues): Promise<string> {

    try {
        const request = await prisma.requirement.create({
            data: {
                userId: data.submittedBy ?? '',
                requestName: data.name,
                requestEmail: data.email,
                requestPhone: data.phone,
                location: data.location,
                propertyType: data.propertyType ? [data.propertyType] : [],
                maxBudget: data.budget,
                minBedrooms: data.bedrooms,
                minBathrooms: data.bathrooms,
                requestRemarks: data.remarks,
                requestStatus: 'new',
            },
        });
        return request.id;
    } catch (error) {
        throw new Error('Failed to submit property request.');
    }
}

export async function getListingRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<ListingRequest[]> {

    try {
        const requests = await prisma.requirement.findMany({
            where: { requestStatus: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return requests.map(r => ({
            id: r.id,
            name: r.requestName ?? '',
            email: r.requestEmail ?? '',
            phone: r.requestPhone ?? undefined,
            location: r.location ?? undefined,
            propertyType: r.propertyType[0] as ListingRequest['propertyType'],
            bedrooms: r.minBedrooms ?? undefined,
            bathrooms: r.minBathrooms ?? undefined,
            budget: r.maxBudget ?? undefined,
            remarks: r.requestRemarks ?? undefined,
            submittedBy: r.userId,
            status: r.requestStatus as ListingRequest['status'],
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        return [];
    }
}
