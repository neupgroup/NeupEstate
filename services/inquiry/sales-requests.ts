
'use server';

import { prisma } from '@neup/core/database/prisma';
import type { SalesRequest, CreateSalesRequestFormValues } from '@/types';
import { logger } from "@neup/logica/logger";


export async function createSalesRequest(data: CreateSalesRequestFormValues): Promise<string> {

    try {
        const request = await prisma.salesRequest.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                propertyLocation: data.propertyLocation,
                propertyType: data.propertyType,
                remarks: data.remarks,
                status: 'new',
            },
        });
        return request.id;
    } catch (error) {
        await logger().type('createSalesRequest').data({ error: String(error), details: {} }).log();
        throw new Error('Failed to submit sales request.');
    }
}

export async function getSalesRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<SalesRequest[]> {

    try {
        const requests = await prisma.salesRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return requests.map(r => ({
            ...r,
            remarks: r.remarks ?? undefined,
            status: r.status as SalesRequest['status'],
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        await logger().type('getSalesRequests').data({ error: String(error), details: {} }).log();
        return [];
    }
}
