

'use server';

import { prisma } from '@neup/core/database/prisma';
import type { PropertyRequest, CreatePropertyRequestFormValues } from '@/types';
import { logger } from "@neup/logica/logger";


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
        await logger().type('createPropertyRequest').data({ error: String(error), details: {} }).log();
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
            phone: r.phone ?? undefined,
            location: r.location ?? undefined,
            propertyType: r.propertyType as PropertyRequest['propertyType'],
            bedrooms: r.bedrooms ?? undefined,
            bathrooms: r.bathrooms ?? undefined,
            budget: r.budget ?? undefined,
            remarks: r.remarks ?? undefined,
            status: r.status as PropertyRequest['status'],
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        await logger().type('getPropertyRequests').data({ error: String(error), details: {} }).log();
        return [];
    }
}
