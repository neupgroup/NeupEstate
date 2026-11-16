'use server';

import type { AIModel, CreateAIModelFormValues, UpdateAIModelFormValues } from '@/types';

const DEFAULT_AI_MODEL: AIModel = {
    id: 'system-default',
    modelId: 'auto',
    name: 'Nia Auto',
    description: 'Nia selects the AI model for each request.',
    costPerMillionInputTokens: 0,
    costPerMillionOutputTokens: 0,
    isDefault: true,
};

/** Returns the code-defined AI model choices. */
export async function getModels(): Promise<AIModel[]> {
    return [DEFAULT_AI_MODEL];
}

/** Returns the configured code-defined model. */
export async function getDefaultModel(): Promise<AIModel> {
    return DEFAULT_AI_MODEL;
}

/** Finds a code-defined model by its identifier. */
export async function getModelById(id: string): Promise<AIModel | null> {
    return id === DEFAULT_AI_MODEL.id || id === DEFAULT_AI_MODEL.modelId ? DEFAULT_AI_MODEL : null;
}

/** Uses Nia model routing unless a flow explicitly supplies a model identifier. */
export async function resolveModelIdentifier(model?: string | null): Promise<string> {
    return model?.trim() || DEFAULT_AI_MODEL.modelId;
}

/** AI models are source controlled; runtime model creation is disabled. */
export async function createModel(_data: CreateAIModelFormValues): Promise<void> {
    throw new Error('AI models are configured in the codebase.');
}

/** AI models are source controlled; runtime model updates are disabled. */
export async function updateModel(_id: string, _data: Omit<UpdateAIModelFormValues, 'id'>): Promise<void> {
    throw new Error('AI models are configured in the codebase.');
}

/** AI models are source controlled; the default model cannot be changed at runtime. */
export async function setDefaultModel(_modelId: string): Promise<void> {
    throw new Error('AI models are configured in the codebase.');
}

/** AI models are source controlled; runtime model deletion is disabled. */
export async function deleteModel(_id: string): Promise<void> {
    throw new Error('AI models are configured in the codebase.');
}
