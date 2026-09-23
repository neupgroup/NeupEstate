'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import type { MortgageRequest } from '@/types';

export async function getMortgageRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<MortgageRequest[]> {
  try {
    const requests = await prisma.mortgageRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return requests.map((request) => ({
      ...request,
      moreDetails: request.moreDetails ?? undefined,
      contactMethods: request.contactMethods as MortgageRequest['contactMethods'],
      status: request.status as MortgageRequest['status'],
      createdAt: request.createdAt.toISOString(),
    }));
  } catch (error) {
    await logger().type('getMortgageRequests').data({ error: String(error), details: {} }).log();
    return [];
  }
}
