
'use server';

import { getFirestore } from '@/lib/firebase';
import type { MortgageRequest, CreateMortgageRequestFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'mortgageRequests';

function toMortgageRequest(doc: FirebaseFirestore.DocumentSnapshot): MortgageRequest {
    const data = doc.data()!;
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        age: data.age,
        income: data.income,
        moreDetails: data.moreDetails,
        contactMethods: data.contactMethods,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createMortgageRequest(data: CreateMortgageRequestFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    try {
        const requestData = {
            ...data,
            createdAt: new Date(),
            status: 'new',
        };

        const docRef = await firestore.collection(COLLECTION_NAME).add(requestData);
        return docRef.id;
    } catch (error) {
        await logProblem(error, 'createMortgageRequest');
        throw new Error('Failed to submit mortgage request.');
    }
}

export async function getMortgageRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<MortgageRequest[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toMortgageRequest);
    } catch (error) {
        await logProblem(error, 'getMortgageRequests');
        return [];
    }
}
