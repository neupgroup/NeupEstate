'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import type { Requirement } from '@/types';

function mapRequirement(requirement: { id: string; userId: string; minBudget: number | null; maxBudget: number | null; location: string | null; propertyType: string[]; purpose: string | null; urgency: string | null; requiredTime: string | null; paymentMethod: string[]; loan: boolean; createdAt: Date; updatedAt: Date }): Requirement {
  return {
    ...requirement,
    location: requirement.location ?? undefined,
    purpose: requirement.purpose ?? undefined,
    urgency: requirement.urgency ?? undefined,
    requiredTime: requirement.requiredTime ?? undefined,
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
  } as Requirement;
}

export async function getRequirementById(id: string): Promise<Requirement | null> {
  try {
    const requirement = await prisma.requirement.findUnique({ where: { id } });
    return requirement ? mapRequirement(requirement) : null;
  } catch (error) {
    await logger().type(`getRequirementById (ID: ${id})`).data({ error: String(error), details: {} }).log();
    return null;
  }
}

export async function getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
  try {
    const requirements = await prisma.requirement.findMany({ where: { userId } });
    return requirements.map(mapRequirement);
  } catch (error) {
    await logger().type(`getRequirementByUserId (UserID: ${userId})`).data({ error: String(error), details: {} }).log();
    return null;
  }
}
