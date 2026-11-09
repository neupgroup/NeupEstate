'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import type { CreateRequirementFormValues } from '@/types';

export async function createRequirement(data: CreateRequirementFormValues): Promise<string> {
  try {
    const requirement = await prisma.requirement.create({
      data: {
        userId: data.userId || '',
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        location: data.location,
        propertyType: data.propertyType || [],
        purpose: data.purpose,
        urgency: data.urgency,
        requiredTime: data.requiredTime,
        paymentMethod: data.paymentMethod || [],
        loan: data.loan || false,
      },
      select: { id: true },
    });
    return requirement.id;
  } catch (error) {
    const prismaError = error instanceof Error ? error as Error & { code?: unknown; meta?: unknown } : null;
    console.error('[requirements] Database create failed', {
      name: prismaError?.name ?? 'UnknownError',
      message: prismaError?.message ?? String(error),
      code: prismaError?.code,
      meta: prismaError?.meta,
      stack: prismaError?.stack,
    });
    await logger().type('createRequirement').data({
      error: prismaError?.message ?? String(error),
      details: {
        name: prismaError?.name ?? 'UnknownError',
        code: prismaError?.code,
        meta: prismaError?.meta,
        stack: prismaError?.stack,
      },
    }).log();
    throw new Error('Failed to create requirement in the database.');
  }
}
