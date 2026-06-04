

'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import type { CreatePromptFormValues } from '@/types';
import { getDefaultModel } from './model-service';

export interface Prompt {
    id: string;
    promptText: string;
    description: string;
    name: string;
    placeholders?: string[];
    model?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Gets a prompt from the database. If it doesn't exist, it creates it with the default value.
 * It also resolves the final model name, using the system default if no specific model is set.
 * @param promptId The unique identifier for the prompt.
 * @param defaultPrompt The default prompt object to seed if it doesn't exist.
 * @returns The full prompt configuration object, including the Genkit-ready model name.
 */
export async function getPrompt(promptId: string, defaultPrompt: Omit<Prompt, 'id'>): Promise<Prompt> {
    try {
        let promptData: Prompt;
        const existing = await prisma.prompt.findUnique({ where: { id: promptId } });

        if (existing) {
            promptData = {
                id: existing.id,
                promptText: existing.promptText,
                description: existing.description,
                name: existing.name,
                model: existing.model || undefined,
                placeholders: existing.placeholders || [],
            };
        } else {
            const created = await prisma.prompt.create({
                data: {
                    id: promptId,
                    promptText: defaultPrompt.promptText,
                    description: defaultPrompt.description,
                    name: defaultPrompt.name,
                    placeholders: defaultPrompt.placeholders || [],
                    model: defaultPrompt.model || null,
                },
            });
            promptData = {
                id: created.id,
                promptText: created.promptText,
                description: created.description,
                name: created.name,
                model: created.model || undefined,
                placeholders: created.placeholders || [],
            };
        }
        
        let modelIdentifier = promptData.model || '';

        // Check for invalid model identifiers (null, undefined, empty, whitespace, or containing slashes/spaces)
        const isInvalidModelId = !modelIdentifier || modelIdentifier.trim() === '' || modelIdentifier.includes('/') || modelIdentifier.includes(' ');

        if (isInvalidModelId) {
            const defaultModel = await getDefaultModel();
            if (defaultModel) {
                 modelIdentifier = defaultModel.modelId;
            } else {
                // Final fallback if no default is set in the DB
                modelIdentifier = 'gemini-2.5-flash';
            }
        }
        
        promptData.model = modelIdentifier;

        return promptData;

    } catch (error) {
        await logProblem(error, `getPrompt (ID: ${promptId})`);
        const defaultModel = await getDefaultModel();
        return { 
            id: promptId, 
            ...defaultPrompt,
            model: defaultModel?.modelId || 'gemini-2.5-flash'
        };
    }
}

/**
 * Retrieves all prompts from the database for the admin page.
 */
export async function getPrompts(): Promise<Prompt[]> {
    try {
        const prompts = await prisma.prompt.findMany({
            orderBy: { updatedAt: 'desc' },
        });
        return prompts.map((prompt) => ({
            id: prompt.id,
            promptText: prompt.promptText,
            description: prompt.description,
            name: prompt.name,
            placeholders: prompt.placeholders || [],
            model: prompt.model || undefined,
            createdAt: prompt.createdAt.toISOString(),
            updatedAt: prompt.updatedAt.toISOString(),
        }));
    } catch (error) {
        await logProblem(error, 'getPrompts');
        return [];
    }
}

/**
 * Retrieves a single prompt by its ID.
 */
export async function getPromptById(id: string): Promise<Prompt | null> {
    try {
        const prompt = await prisma.prompt.findUnique({ where: { id } });
        if (!prompt) return null;
        return {
            id: prompt.id,
            promptText: prompt.promptText,
            description: prompt.description,
            name: prompt.name,
            placeholders: prompt.placeholders || [],
            model: prompt.model || undefined,
            createdAt: prompt.createdAt.toISOString(),
            updatedAt: prompt.updatedAt.toISOString(),
        };
    } catch (error) {
        await logProblem(error, `getPromptById (ID: ${id})`);
        return null;
    }
}


/**
 * Creates a new prompt in the database.
 * @param data The prompt data including the ID.
 */
export async function createPrompt(data: CreatePromptFormValues): Promise<void> {
    try {
        const existing = await prisma.prompt.findUnique({ where: { id: data.id } });
        if (existing) {
            throw new Error(`A prompt with the ID "${data.id}" already exists.`);
        }

        await prisma.prompt.create({
            data: {
                id: data.id,
                promptText: data.promptText,
                description: data.description,
                name: data.name,
                placeholders: data.placeholders?.split(',').map((p) => p.trim()).filter(Boolean) || [],
                model: data.model || null,
            },
        });
    } catch (error: any) {
        await logProblem(error, `createPrompt (ID: ${data.id})`);
        throw error; // Re-throw to be handled by the action
    }
}


/**
 * Updates an existing prompt in the database.
 * @param id The ID of the prompt to update.
 * @param data The partial prompt data to update.
 */
export async function updatePrompt(id: string, data: Omit<CreatePromptFormValues, 'id'>): Promise<void> {
    try {
        await prisma.prompt.update({
            where: { id },
            data: {
                promptText: data.promptText,
                description: data.description,
                name: data.name,
                placeholders: data.placeholders?.split(',').map((p) => p.trim()).filter(Boolean) || [],
                model: data.model || null,
            },
        });
    } catch (error: any) {
        await logProblem(error, `updatePrompt (ID: ${id})`);
        throw new Error('Failed to update prompt.');
    }
}

/**
 * Deletes a prompt from the database.
 * @param promptId The ID of the prompt to delete.
 */
export async function deletePrompt(promptId: string): Promise<void> {
    try {
        await prisma.prompt.delete({ where: { id: promptId } });
    } catch (error: any) {
        await logProblem(error, `deletePrompt (ID: ${promptId})`);
        throw new Error('Failed to delete prompt from database.');
    }
}
