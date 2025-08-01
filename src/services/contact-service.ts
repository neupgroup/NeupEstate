
'use server';

import { getFirestore } from '@/lib/firebase';
import type { ContactSubmission, CreateContactSubmissionFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'contactSubmissions';

function toContactSubmission(doc: FirebaseFirestore.DocumentSnapshot): ContactSubmission {
    const data = doc.data()!;
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        body: data.body,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createContactSubmission(data: CreateContactSubmissionFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    try {
        const submissionData = {
            ...data,
            createdAt: new Date(),
            status: 'new',
        };

        const docRef = await firestore.collection(COLLECTION_NAME).add(submissionData);
        return docRef.id;
    } catch (error) {
        await logProblem(error, 'createContactSubmission');
        throw new Error('Failed to submit contact form.');
    }
}

export async function getContactSubmissions({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<ContactSubmission[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toContactSubmission);
    } catch (error) {
        await logProblem(error, 'getContactSubmissions');
        return [];
    }
}
