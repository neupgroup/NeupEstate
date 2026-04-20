

'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type { AIModel, CreateAIModelFormValues, UpdateAIModelFormValues } from '@/types';

export async function getModels(): Promise<AIModel[]> {
    try {
        const models = await prisma.aIModel.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return models.map((model) => ({
            id: model.id,
            modelId: model.modelId,
            name: model.name,
            description: model.description || undefined,
            costPerMillionInputTokens: model.costPerMillionInputTokens ?? 0,
            costPerMillionOutputTokens: model.costPerMillionOutputTokens ?? 0,
            isDefault: model.isDefault,
        }));
    } catch (error) {
        await logProblem(error, 'getModels');
        return [];
    }
}

export async function getDefaultModel(): Promise<AIModel | null> {
    try {
        const model = await prisma.aIModel.findFirst({
            where: { isDefault: true },
        });
        if (!model) return null;
        return {
            id: model.id,
            modelId: model.modelId,
            name: model.name,
            description: model.description || undefined,
            costPerMillionInputTokens: model.costPerMillionInputTokens ?? 0,
            costPerMillionOutputTokens: model.costPerMillionOutputTokens ?? 0,
            isDefault: model.isDefault,
        };
    } catch(error) {
        await logProblem(error, 'getDefaultModel');
        return null;
    }
}

export async function createModel(data: CreateAIModelFormValues): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                await tx.aIModel.updateMany({
                    data: { isDefault: false },
                    where: { isDefault: true },
                });
            }

            await tx.aIModel.create({
                data: {
                    modelId: data.modelId,
                    name: data.name,
                    description: data.description || null,
                    costPerMillionInputTokens: data.costPerMillionInputTokens ?? 0,
                    costPerMillionOutputTokens: data.costPerMillionOutputTokens ?? 0,
                    isDefault: Boolean(data.isDefault),
                },
            });
        });
    } catch (error) {
        await logProblem(error, 'createModel');
        throw error;
    }
}

export async function updateModel(id: string, data: Omit<UpdateAIModelFormValues, 'id'>): Promise<void> {
    try {
        if (data.isDefault) {
            await setDefaultModel(id);
        }

        const { id: formId, ...updateData } = data;
        await prisma.aIModel.update({
            where: { id },
            data: {
                modelId: updateData.modelId,
                name: updateData.name,
                description: updateData.description || null,
                costPerMillionInputTokens: updateData.costPerMillionInputTokens ?? 0,
                costPerMillionOutputTokens: updateData.costPerMillionOutputTokens ?? 0,
                isDefault: updateData.isDefault ?? undefined,
            },
        });
    } catch (error) {
        await logProblem(error, `updateModel (ID: ${id})`);
        throw error;
    }
}

export async function setDefaultModel(modelId: string): Promise<void> {
    await prisma.$transaction([
        prisma.aIModel.updateMany({
            data: { isDefault: false },
            where: { isDefault: true },
        }),
        prisma.aIModel.update({
            where: { id: modelId },
            data: { isDefault: true },
        }),
    ]);
}

export async function deleteModel(id: string): Promise<void> {
    try {
        await prisma.aIModel.delete({
            where: { id },
        });
    } catch (error) {
        await logProblem(error, `deleteModel (ID: ${id})`);
        throw error;
    }
}
