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
    await logger().type(`updateRequirement (ID: ${id})`).data({ error: String(error), details: {} }).log();
    throw new Error('Failed to update requirement in the database.');
  }
}
