
'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import type { Requirement, CreateRequirementFormValues } from '@/types';

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
        });
        return requirement.id;
    } catch (error) {
        await logProblem(error, 'createRequirement');
        throw new Error("Failed to create requirement in the database.");
    }
}

export async function getRequirementById(id: string): Promise<Requirement | null> {
    try {
        const requirement = await prisma.requirement.findUnique({
            where: { id },
        });
        return requirement ? mapPrismaRequirementToType(requirement) : null;
    } catch (error) {
        await logProblem(error, `getRequirementById (ID: ${id})`);
        return null;
    }
}

export async function getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
    try {
        const requirements = await prisma.requirement.findMany({
            where: { userId },
        });
        return requirements.map(mapPrismaRequirementToType);
    } catch (error) {
        await logProblem(error, `getRequirementByUserId (UserID: ${userId})`);
        return null;
    }
}

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
        await logProblem(error, `updateRequirement (ID: ${id})`);
        throw new Error("Failed to update requirement in the database.");
    }
}

/**
 * Maps Prisma Requirement to Requirement type.
 */
function mapPrismaRequirementToType(requirement: any): Requirement {
    return {
        id: requirement.id,
        userId: requirement.userId,
        minBudget: requirement.minBudget,
        maxBudget: requirement.maxBudget,
        location: requirement.location,
        propertyType: requirement.propertyType,
        purpose: requirement.purpose,
        urgency: requirement.urgency,
        requiredTime: requirement.requiredTime,
        paymentMethod: requirement.paymentMethod,
        loan: requirement.loan,
        createdAt: requirement.createdAt.toISOString(),
        updatedAt: requirement.updatedAt.toISOString(),
    };
}
