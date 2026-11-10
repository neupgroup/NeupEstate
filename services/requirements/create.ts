'use server';

import { prisma } from '@neup/core/database/prisma';
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
    throw new Error('Failed to create requirement in the database.');
  }
}
