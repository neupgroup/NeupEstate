
'use server';

import { prisma } from '@neup/core/database/prisma';
import type { VisitRequest, CreateVisitRequestFormValues } from '@/types';
import { getListingBySlug } from '../../view';
import { getAgentById } from '@/services/agents/agent/service';
import { getListingSlugId } from '@/services/listings/slug';


export async function createVisitRequest(data: CreateVisitRequestFormValues): Promise<string> {

    try {
        const property = await getListingBySlug(data.slug);
        if (!property || !(property as any).listingAgent) {
            throw new Error(`Property or its listing agent not found.`);
        }
        
        // In a real app, you'd look up the agent by name. Here we assume name is unique or first match is fine.
        // This is a simplification. A real app should use agent IDs.
        const agent = await getAgentById((property as any).listingAgent);
        if (!agent) {
            throw new Error(`Agent with ID ${(property as any).listingAgent} not found.`);
        }

        const request = await prisma.visitRequest.create({
            data: {
                propertyId: property.id,
                propertyTitle: property.title,
                agentId: agent.id,
                agentName: agent.name,
                name: data.name,
                email: data.email,
                phone: data.phone,
                preferredDate: data.preferred_date,
                preferredTime: data.preferred_time,
                status: 'new',
            },
        });
        return request.id;
    } catch (error) {
        throw new Error('Failed to submit visit request.');
    }
}

export async function getVisitRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<VisitRequest[]> {

    try {
        const requests = await prisma.visitRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const listingIds = [...new Set(requests.map((request) => request.propertyId))];
        const listings = listingIds.length ? await prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, slug: true } }) : [];
        const slugById = new Map(listings.map((listing) => [listing.id, getListingSlugId(listing)]));
        return requests.map(({ propertyId, preferredDate, preferredTime, createdAt, ...request }) => ({
            ...request,
            ...(slugById.has(propertyId) ? { slug: slugById.get(propertyId) } : {}),
            phone: request.phone ?? undefined,
            preferred_date: preferredDate,
            preferred_time: preferredTime ?? undefined,
            status: request.status as VisitRequest['status'],
            createdAt: createdAt.toISOString(),
        }));
    } catch (error) {
        return [];
    }
}
