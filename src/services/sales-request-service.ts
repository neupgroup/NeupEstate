
'use server';

import { getFirestore } from '@/lib/firebase';
import type { SalesRequest, CreateSalesRequestFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'salesRequests';

// Helper to convert Firestore doc to SalesRequest type
function toSalesRequest(doc: FirebaseFirestore.DocumentSnapshot): SalesRequest {
    const data = doc.data()!;
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        propertyLocation: data.propertyLocation,
        propertyType: data.propertyType,
        remarks: data.remarks,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createSalesRequest(data: CreateSalesRequestFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    try {
        const requestData = {
            ...data,
            createdAt: new Date(),
            status: 'new', // Initial status
        };

        const docRef = await firestore.collection(COLLECTION_NAME).add(requestData);
        return docRef.id;
    } catch (error) {
        await logProblem(error, 'createSalesRequest');
        throw new Error('Failed to submit sales request.');
    }
}

export async function getSalesRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<SalesRequest[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toSalesRequest);
    } catch (error) {
        await logProblem(error, 'getSalesRequests');
        return [];
    }
}
