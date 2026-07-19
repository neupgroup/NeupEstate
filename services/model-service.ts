

'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/core/database/prisma';
import { logProblem } from './problem-service';
import type { AIModel, CreateAIModelFormValues, UpdateAIModelFormValues } from '@/types';

const DEFAULT_AI_MODEL: AIModel = {
    id: 'system-default',
    modelId: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Built-in default model used when no prompt-specific model is configured.',
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    isDefault: true,
};

const MODEL_CONFIG_SECTION = 'ai_models';
const MODEL_CONFIG_KEY_PREFIX = 'ai.model.';

function modelConfigKey(id: string): string {
    return `${MODEL_CONFIG_KEY_PREFIX}${id}`;
}

function parseModelConfig(value: string): AIModel | null {
    try {
        const model = JSON.parse(value) as AIModel;
        if (!model.id || !model.modelId || !model.name) {
            return null;
        }
        return {
            ...model,
            description: model.description ?? '',
            costPerMillionInputTokens: model.costPerMillionInputTokens ?? 0,
            costPerMillionOutputTokens: model.costPerMillionOutputTokens ?? 0,
            isDefault: Boolean(model.isDefault),
        };
    } catch {
        return null;
    }
}

function serializeModelConfig(model: AIModel): string {
    return JSON.stringify(model);
}

export async function getModels(): Promise<AIModel[]> {
    try {
        const rows = await prisma.siteContent.findMany({
            where: { section: MODEL_CONFIG_SECTION },
            orderBy: { updatedAt: 'desc' },
        });
        const models = rows.flatMap((row) => {
            const model = parseModelConfig(row.value);
            return model ? [model] : [];
        });

        return models.length > 0 ? models : [DEFAULT_AI_MODEL];
    } catch (error) {
        await logProblem(error, 'getModels');
        return [DEFAULT_AI_MODEL];
    }
}

export async function getDefaultModel(): Promise<AIModel | null> {
    const models = await getModels();
    return models.find((model) => model.isDefault) || models[0] || DEFAULT_AI_MODEL;
}

export async function getModelById(id: string): Promise<AIModel | null> {
    const models = await getModels();
    return models.find((model) => model.id === id) || null;
}

export async function resolveModelIdentifier(model?: string | null): Promise<string> {
    const modelIdentifier = model?.trim();
    if (!modelIdentifier) {
        return (await getDefaultModel())?.modelId || DEFAULT_AI_MODEL.modelId;
    }

    const configuredModel = await getModelById(modelIdentifier);
    return configuredModel?.modelId || modelIdentifier;
}

export async function createModel(data: CreateAIModelFormValues): Promise<void> {
    try {
        const model: AIModel = {
            id: randomUUID(),
            modelId: data.modelId,
            name: data.name,
            description: data.description || '',
            costPerMillionInputTokens: data.costPerMillionInputTokens ?? 0,
            costPerMillionOutputTokens: data.costPerMillionOutputTokens ?? 0,
            isDefault: Boolean(data.isDefault),
        };

        await prisma.$transaction(async (tx) => {
            if (model.isDefault) {
                const rows = await tx.siteContent.findMany({ where: { section: MODEL_CONFIG_SECTION } });
                await Promise.all(rows.map(async (row) => {
                    const existingModel = parseModelConfig(row.value);
                    if (!existingModel?.isDefault) return;
                    await tx.siteContent.update({
                        where: { key: row.key },
                        data: {
                            value: serializeModelConfig({ ...existingModel, isDefault: false }),
                        },
                    });
                }));
            }

            await tx.siteContent.create({
                data: {
                    key: modelConfigKey(model.id),
                    section: MODEL_CONFIG_SECTION,
                    value: serializeModelConfig(model),
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
        const existing = await getModelById(id);
        if (!existing) {
            throw new Error(`AI model "${id}" was not found.`);
        }

        const updated: AIModel = {
            ...existing,
            modelId: data.modelId,
            name: data.name,
            description: data.description || '',
            costPerMillionInputTokens: data.costPerMillionInputTokens ?? 0,
            costPerMillionOutputTokens: data.costPerMillionOutputTokens ?? 0,
            isDefault: Boolean(data.isDefault),
        };

        await prisma.$transaction(async (tx) => {
            if (updated.isDefault) {
                const rows = await tx.siteContent.findMany({ where: { section: MODEL_CONFIG_SECTION } });
                await Promise.all(rows.map(async (row) => {
                    const model = parseModelConfig(row.value);
                    if (!model?.isDefault || model.id === id) return;
                    await tx.siteContent.update({
                        where: { key: row.key },
                        data: {
                            value: serializeModelConfig({ ...model, isDefault: false }),
                        },
                    });
                }));
            }

            await tx.siteContent.update({
                where: { key: modelConfigKey(id) },
                data: { value: serializeModelConfig(updated) },
            });
        });
    } catch (error) {
        await logProblem(error, `updateModel (ID: ${id})`);
        throw error;
    }
}

export async function setDefaultModel(modelId: string): Promise<void> {
    const existing = await getModelById(modelId);
    if (!existing) {
        throw new Error(`AI model "${modelId}" was not found.`);
    }

    await prisma.$transaction(async (tx) => {
        const rows = await tx.siteContent.findMany({ where: { section: MODEL_CONFIG_SECTION } });
        await Promise.all(rows.map(async (row) => {
            const model = parseModelConfig(row.value);
            if (!model) return;
            await tx.siteContent.update({
                where: { key: row.key },
                data: {
                    value: serializeModelConfig({ ...model, isDefault: model.id === modelId }),
                },
            });
        }));
    });
}

export async function deleteModel(id: string): Promise<void> {
    try {
        await prisma.siteContent.delete({
            where: { key: modelConfigKey(id) },
        });
    } catch (error) {
        await logProblem(error, `deleteModel (ID: ${id})`);
        throw error;
    }
}
