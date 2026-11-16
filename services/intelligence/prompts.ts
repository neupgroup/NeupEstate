'use server';

import type { CreatePromptFormValues } from '@/types';
import { resolveModelIdentifier } from './models';

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

/** Returns the prompt definition supplied by its source-controlled AI flow. */
export async function getPrompt(promptId: string, defaultPrompt: Omit<Prompt, 'id'>): Promise<Prompt> {
    return {
        id: promptId,
        ...defaultPrompt,
        placeholders: defaultPrompt.placeholders || [],
        model: await resolveModelIdentifier(defaultPrompt.model),
    };
}

/** Runtime prompt administration is disabled because prompts live in code. */
export async function getPrompts(): Promise<Prompt[]> {
    return [];
}

/** Runtime prompt lookup is disabled because prompts live in code. */
export async function getPromptById(_id: string): Promise<Prompt | null> {
    return null;
}

/** Prompts are source controlled; runtime prompt creation is disabled. */
export async function createPrompt(_data: CreatePromptFormValues): Promise<void> {
    throw new Error('AI prompts are configured in the codebase.');
}

/** Prompts are source controlled; runtime prompt updates are disabled. */
export async function updatePrompt(_id: string, _data: Omit<CreatePromptFormValues, 'id'>): Promise<void> {
    throw new Error('AI prompts are configured in the codebase.');
}

/** Prompts are source controlled; runtime prompt deletion is disabled. */
export async function deletePrompt(_promptId: string): Promise<void> {
    throw new Error('AI prompts are configured in the codebase.');
}
