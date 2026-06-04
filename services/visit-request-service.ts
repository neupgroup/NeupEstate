
'use server';

import { prisma } from '@/logica/core/prisma';
import type { VisitRequest, CreateVisitRequestFormValues } from '@/types';
import { getPropertyById } from './property-service';
import { getAgentById } from './agent-service';
import { logProblem } from './problem-service';


export async function createVisitRequest(data: CreateVisitRequestFormValues): Promise<string> {

    try {
        const property = await getPropertyById(data.propertyId);
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
                propertyId: data.propertyId,
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
        await logProblem(error, 'createVisitRequest');
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
        return requests.map(r => ({
            ...r,
            phone: r.phone ?? undefined,
            preferred_date: r.preferredDate,
            preferred_time: r.preferredTime ?? undefined,
            status: r.status as VisitRequest['status'],
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        await logProblem(error, 'getVisitRequests');
        return [];
    }
}
