
'use server';

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
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
        await logger().type('createRequirement').data({ error: String(error), details: {} }).log();
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
        await logger().type(`getRequirementById (ID: ${id})`).data({ error: String(error), details: {} }).log();
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
        await logger().type(`getRequirementByUserId (UserID: ${userId})`).data({ error: String(error), details: {} }).log();
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
        await logger().type(`updateRequirement (ID: ${id})`).data({ error: String(error), details: {} }).log();
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
