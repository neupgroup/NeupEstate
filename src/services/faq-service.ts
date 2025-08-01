
'use server';

import { getFirestore } from '@/lib/firebase';
import type { FAQ, CreateFaqFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'faqs';

export async function getFaqs({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<FAQ[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                question: data.question,
                answer: data.answer,
                category: data.category,
                createdAt: data.createdAt.toDate().toISOString(),
            } as FAQ;
        });
    } catch (error) {
        await logProblem(error, 'getFaqs');
        return [];
    }
}

export async function createFaq(faqData: CreateFaqFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        const docRef = await firestore.collection(COLLECTION_NAME).add({
            ...faqData,
            createdAt: new Date(),
        });
        return docRef.id;
    } catch (error: any) {
        await logProblem(error, 'createFaq');
        throw new Error('Failed to create FAQ.');
    }
}

export async function updateFaq(id: string, faqData: CreateFaqFormValues): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        await firestore.collection(COLLECTION_NAME).doc(id).update(faqData);
    } catch (error: any) {
        await logProblem(error, `updateFaq (ID: ${id})`);
        throw new Error('Failed to update FAQ.');
    }
}

export async function deleteFaq(id: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        await firestore.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error: any) {
        await logProblem(error, `deleteFaq (ID: ${id})`);
        throw new Error('Failed to delete FAQ.');
    }
}
