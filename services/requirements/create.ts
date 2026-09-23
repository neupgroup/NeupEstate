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
    await logger().type('createRequirement').data({ error: String(error), details: {} }).log();
    throw new Error('Failed to create requirement in the database.');
  }
}
