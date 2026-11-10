'use server';

import { prisma } from '@neup/core/database/prisma';
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
    throw new Error('Failed to update requirement in the database.');
  }
}
