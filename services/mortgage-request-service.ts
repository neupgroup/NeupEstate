
'use server';

import { prisma } from '@/core/database/prisma';
import type { MortgageRequest, CreateMortgageRequestFormValues } from '@/types';
import { logProblem } from './problem-service';


export async function createMortgageRequest(data: CreateMortgageRequestFormValues): Promise<string> {

    try {
        const request = await prisma.mortgageRequest.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                age: data.age,
                income: data.income,
                moreDetails: data.moreDetails,
                contactMethods: data.contactMethods,
                status: 'new',
            },
        });
        return request.id;
    } catch (error) {
        await logProblem(error, 'createMortgageRequest');
        throw new Error('Failed to submit mortgage request.');
    }
}

export async function getMortgageRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<MortgageRequest[]> {

    try {
        const requests = await prisma.mortgageRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return requests.map(r => ({
            ...r,
            moreDetails: r.moreDetails ?? undefined,
            contactMethods: r.contactMethods as MortgageRequest['contactMethods'],
            status: r.status as MortgageRequest['status'],
            createdAt: r.createdAt.toISOString(),
        }));
    } catch (error) {
        await logProblem(error, 'getMortgageRequests');
        return [];
    }
}
