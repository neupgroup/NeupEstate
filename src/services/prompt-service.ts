

'use server';

import { getFirestore } from '@/lib/firebase';
import { logProblem } from './problem-service';
import type { CreatePromptFormValues } from '@/types';
import { getDefaultModel } from './model-service';

const COLLECTION_NAME = 'prompts';

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
 * Gets a prompt from Firestore. If it doesn't exist, it creates it with the default value.
 * It also resolves the final model name, using the system default if no specific model is set.
 * @param promptId The unique identifier for the prompt.
 * @param defaultPrompt The default prompt object to seed if it doesn't exist.
 * @returns The full prompt configuration object, including the Genkit-ready model name.
 */
export async function getPrompt(promptId: string, defaultPrompt: Omit<Prompt, 'id'>): Promise<Prompt> {
    const firestore = getFirestore();
    if (!firestore) {
        console.warn(`Firestore not available, returning default prompt for ${promptId}`);
        const defaultModel = await getDefaultModel();
        return { 
            id: promptId, 
            ...defaultPrompt,
            model: defaultModel?.modelId || 'gemini-1.5-flash-latest' // Fallback to simple name
        };
    }

    try {
        const docRef = firestore.collection(COLLECTION_NAME).doc(promptId);
        const docSnap = await docRef.get();
        let promptData: Prompt;

        if (docSnap.exists) {
            const data = docSnap.data()!;
            promptData = {
                id: docSnap.id,
                promptText: data.promptText,
                description: data.description,
                name: data.name,
                model: data.model,
                placeholders: data.placeholders || [],
            };
        } else {
            console.log(`Prompt '${promptId}' not found, seeding with default.`);
            const dataToSave = {
                ...defaultPrompt,
                id: promptId,
                createdAt: new Date(),
                updatedAt: new Date(),
                placeholders: defaultPrompt.placeholders || [],
                model: defaultPrompt.model || '',
            };
            await docRef.set(dataToSave);
            promptData = { id: promptId, ...defaultPrompt };
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
                modelIdentifier = 'gemini-1.5-flash-latest';
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
            model: defaultModel?.modelId || 'gemini-1.5-flash-latest'
        };
    }
}

/**
 * Retrieves all prompts from Firestore for the admin page.
 */
export async function getPrompts(): Promise<Prompt[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                promptText: data.promptText,
                description: data.description,
                name: data.name,
                placeholders: data.placeholders || [],
                model: data.model,
            } as Prompt;
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
    const firestore = getFirestore();
    if (!firestore) return null;

    try {
        const docRef = await firestore.collection(COLLECTION_NAME).doc(id).get();
        if (!docRef.exists) {
            return null;
        }
        const data = docRef.data()!;
         return {
            id: docRef.id,
            promptText: data.promptText,
            description: data.description,
            name: data.name,
            placeholders: data.placeholders || [],
            model: data.model,
        } as Prompt;
    } catch (error) {
        await logProblem(error, `getPromptById (ID: ${id})`);
        return null;
    }
}


/**
 * Creates a new prompt in Firestore.
 * @param data The prompt data including the ID.
 */
export async function createPrompt(data: CreatePromptFormValues): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');

    try {
        const docRef = firestore.collection(COLLECTION_NAME).doc(data.id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            throw new Error(`A prompt with the ID "${data.id}" already exists.`);
        }

        const dataToSave = {
            ...data,
            placeholders: data.placeholders?.split(',').map(p => p.trim()).filter(Boolean) || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await docRef.set(dataToSave);
    } catch (error: any) {
        await logProblem(error, `createPrompt (ID: ${data.id})`);
        throw error; // Re-throw to be handled by the action
    }
}


/**
 * Updates an existing prompt in Firestore.
 * @param id The ID of the prompt to update.
 * @param data The partial prompt data to update.
 */
export async function updatePrompt(id: string, data: Omit<CreatePromptFormValues, 'id'>): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');

    try {
        const docRef = firestore.collection(COLLECTION_NAME).doc(id);
        const dataToUpdate = {
            ...data,
            placeholders: data.placeholders?.split(',').map(p => p.trim()).filter(Boolean) || [],
            updatedAt: new Date(),
        };
        await docRef.update(dataToUpdate);
    } catch (error: any) {
        await logProblem(error, `updatePrompt (ID: ${id})`);
        throw new Error('Failed to update prompt.');
    }
}

/**
 * Deletes a prompt from Firestore.
 * @param promptId The ID of the prompt to delete.
 */
export async function deletePrompt(promptId: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        const docRef = firestore.collection(COLLECTION_NAME).doc(promptId);
        await docRef.delete();
    } catch (error: any) {
        await logProblem(error, `deletePrompt (ID: ${promptId})`);
        throw new Error('Failed to delete prompt from database.');
    }
}
