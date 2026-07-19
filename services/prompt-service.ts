

'use server';

import { prisma } from '@/core/database/prisma';
import { logProblem } from './problem-service';
import type { CreatePromptFormValues } from '@/types';
import { resolveModelIdentifier } from './model-service';

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

const FALLBACK_MODEL_ID = 'gemini-2.5-flash-lite';
const PROMPT_CONFIG_SECTION = 'ai_prompts';
const PROMPT_CONFIG_KEY_PREFIX = 'ai.prompt.';

function promptConfigKey(id: string): string {
    return `${PROMPT_CONFIG_KEY_PREFIX}${id}`;
}

function parsePromptConfig(value: string): Prompt | null {
    try {
        const prompt = JSON.parse(value) as Prompt;
        if (!prompt.id || !prompt.name || !prompt.description || !prompt.promptText) {
            return null;
        }
        return {
            ...prompt,
            placeholders: prompt.placeholders || [],
            model: prompt.model || undefined,
        };
    } catch {
        return null;
    }
}

function serializePromptConfig(prompt: Prompt): string {
    return JSON.stringify(prompt);
}

async function resolveModelId(model?: string): Promise<string> {
    const modelIdentifier = model || '';
    const isInvalidModelId = !modelIdentifier || modelIdentifier.trim() === '' || modelIdentifier.includes('/') || modelIdentifier.includes(' ');

    if (isInvalidModelId) {
        return resolveModelIdentifier();
    }

    return resolveModelIdentifier(modelIdentifier) || FALLBACK_MODEL_ID;
}

/**
 * Gets a prompt from the built-in flow defaults.
 * It also resolves the final model name, using the system default if no specific model is set.
 * @param promptId The unique identifier for the prompt.
 * @param defaultPrompt The default prompt object supplied by the AI flow.
 * @returns The full prompt configuration object, including the Genkit-ready model name.
 */
export async function getPrompt(promptId: string, defaultPrompt: Omit<Prompt, 'id'>): Promise<Prompt> {
    let promptData: Prompt = {
        id: promptId,
        ...defaultPrompt,
        placeholders: defaultPrompt.placeholders || [],
    };

    try {
        const row = await prisma.siteContent.findUnique({
            where: { key: promptConfigKey(promptId) },
        });
        const configuredPrompt = row ? parsePromptConfig(row.value) : null;
        if (configuredPrompt) {
            promptData = configuredPrompt;
        }
    } catch (error) {
        await logProblem(error, `getPrompt (ID: ${promptId})`);
    }

    return {
        ...promptData,
        model: await resolveModelId(promptData.model),
    };
}

/**
 * Retrieves configurable prompts for the admin page.
 */
export async function getPrompts(): Promise<Prompt[]> {
    try {
        const rows = await prisma.siteContent.findMany({
            where: { section: PROMPT_CONFIG_SECTION },
            orderBy: { updatedAt: 'desc' },
        });
        return rows.flatMap((row) => {
            const prompt = parsePromptConfig(row.value);
            if (!prompt) return [];
            return [{
                ...prompt,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }];
        });
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
        const row = await prisma.siteContent.findUnique({
            where: { key: promptConfigKey(id) },
        });
        if (!row) return null;
        const prompt = parsePromptConfig(row.value);
        if (!prompt) return null;
        return {
            ...prompt,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    } catch (error) {
        await logProblem(error, `getPromptById (ID: ${id})`);
        return null;
    }
}


/**
 * Creates a new prompt configuration.
 * @param data The prompt data including the ID.
 */
export async function createPrompt(data: CreatePromptFormValues): Promise<void> {
    try {
        const prompt: Prompt = {
            id: data.id,
            promptText: data.promptText,
            description: data.description,
            name: data.name,
            placeholders: data.placeholders?.split(',').map((p) => p.trim()).filter(Boolean) || [],
            model: data.model || undefined,
        };

        await prisma.siteContent.create({
            data: {
                key: promptConfigKey(data.id),
                section: PROMPT_CONFIG_SECTION,
                value: serializePromptConfig(prompt),
            },
        });
    } catch (error: any) {
        await logProblem(error, `createPrompt (ID: ${data.id})`);
        throw error;
    }
}


/**
 * Updates an existing prompt configuration.
 * @param id The ID of the prompt to update.
 * @param data The partial prompt data to update.
 */
export async function updatePrompt(id: string, data: Omit<CreatePromptFormValues, 'id'>): Promise<void> {
    try {
        const existing = await getPromptById(id);
        if (!existing) {
            throw new Error(`Prompt "${id}" was not found.`);
        }

        const prompt: Prompt = {
            id,
            promptText: data.promptText,
            description: data.description,
            name: data.name,
            placeholders: data.placeholders?.split(',').map((p) => p.trim()).filter(Boolean) || [],
            model: data.model || undefined,
        };

        await prisma.siteContent.update({
            where: { key: promptConfigKey(id) },
            data: {
                value: serializePromptConfig(prompt),
            },
        });
    } catch (error: any) {
        await logProblem(error, `updatePrompt (ID: ${id})`);
        throw new Error('Failed to update prompt.');
    }
}

/**
 * Deletes a prompt configuration.
 * @param promptId The ID of the prompt to delete.
 */
export async function deletePrompt(promptId: string): Promise<void> {
    try {
        await prisma.siteContent.delete({ where: { key: promptConfigKey(promptId) } });
    } catch (error: any) {
        await logProblem(error, `deletePrompt (ID: ${promptId})`);
        throw new Error('Failed to delete prompt.');
    }
}
