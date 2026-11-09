'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import type { CreateRequirementFormValues } from '@/types';

export async function updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
  try {
    await prisma.requirement.update({
      where: { id },
      data: {
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        location: data.location,
        propertyType: data.propertyType,
        purpose: data.purpose,
        urgency: data.urgency,
        requiredTime: data.requiredTime,
        paymentMethod: data.paymentMethod,
        loan: data.loan,
      },
    });
  } catch (error) {
    const prismaError = error instanceof Error ? error as Error & { code?: unknown; meta?: unknown } : null;
    console.error('[requirements] Database update failed', {
      name: prismaError?.name ?? 'UnknownError',
      message: prismaError?.message ?? String(error),
      code: prismaError?.code,
      meta: prismaError?.meta,
      stack: prismaError?.stack,
    });
    await logger().type('updateRequirement').data({
      error: prismaError?.message ?? String(error),
      details: {
        name: prismaError?.name ?? 'UnknownError',
        code: prismaError?.code,
        meta: prismaError?.meta,
        stack: prismaError?.stack,
      },
    }).log();
    throw new Error('Failed to update requirement in the database.');
  }
}
