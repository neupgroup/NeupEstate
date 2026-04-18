

'use server';

import { getFirestore } from '@/lib/firebase';
import { logProblem } from './problem-service';
import type { AIModel, CreateAIModelFormValues, UpdateAIModelFormValues } from '@/types';

const COLLECTION_NAME = 'ai_models';

function toModel(doc: FirebaseFirestore.DocumentSnapshot): AIModel {
    const data = doc.data()!;
    return {
        id: doc.id,
        modelId: data.modelId, // The full technical path
        name: data.name,
        description: data.description,
        costPerMillionInputTokens: data.costPerMillionInputTokens || 0,
        costPerMillionOutputTokens: data.costPerMillionOutputTokens || 0,
        isDefault: data.isDefault || false,
    };
}

export async function getModels(): Promise<AIModel[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(toModel);
    } catch (error) {
        await logProblem(error, 'getModels');
        return [];
    }
}

export async function getDefaultModel(): Promise<AIModel | null> {
    const firestore = getFirestore();
    if (!firestore) return null;
    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).where('isDefault', '==', true).limit(1).get();
        if (snapshot.empty) {
            return null;
        }
        return toModel(snapshot.docs[0]);
    } catch(error) {
        await logProblem(error, 'getDefaultModel');
        return null;
    }
}

export async function createModel(data: CreateAIModelFormValues): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");
    
    try {
        if (data.isDefault) {
            // Firestore doesn't have a great way to do this atomically without a transaction
            // on the creation itself, so we pre-emptively unset the old default.
             const oldDefault = await getDefaultModel();
             if(oldDefault) {
                await firestore.collection(COLLECTION_NAME).doc(oldDefault.id).update({ isDefault: false });
             }
        }

        await firestore.collection(COLLECTION_NAME).add({
            ...data,
            createdAt: new Date(),
        });

    } catch (error) {
        await logProblem(error, 'createModel');
        throw error;
    }
}

export async function updateModel(id: string, data: Omit<UpdateAIModelFormValues, 'id'>): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");

    try {
        if (data.isDefault) {
            await setDefaultModel(id);
        }
        // Remove the 'id' field from the data object before updating
        const { id: formId, ...updateData } = data;
        await firestore.collection(COLLECTION_NAME).doc(id).update(updateData);
    } catch (error) {
        await logProblem(error, `updateModel (ID: ${id})`);
        throw error;
    }
}

export async function setDefaultModel(modelId: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");

    const batch = firestore.batch();
    const modelsCollection = firestore.collection(COLLECTION_NAME);

    // Unset the default flag on all other models
    const snapshot = await modelsCollection.where('isDefault', '==', true).get();
    snapshot.forEach(doc => {
        if (doc.id !== modelId) {
            batch.update(doc.ref, { isDefault: false });
        }
    });

    // Set the new default model
    const newDefaultRef = modelsCollection.doc(modelId);
    batch.update(newDefaultRef, { isDefault: true });

    await batch.commit();
}

export async function deleteModel(id: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");
    
    try {
        await firestore.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        await logProblem(error, `deleteModel (ID: ${id})`);
        throw error;
    }
}
