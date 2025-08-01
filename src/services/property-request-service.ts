

'use server';

import { getFirestore } from '@/lib/firebase';
import type { PropertyRequest, CreatePropertyRequestFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'propertyRequests';

// Helper to convert Firestore doc to Inquiry type
function toPropertyRequest(doc: FirebaseFirestore.DocumentSnapshot): PropertyRequest {
    const data = doc.data()!;
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        location: data.location,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        budget: data.budget,
        remarks: data.remarks,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createPropertyRequest(data: CreatePropertyRequestFormValues): Promise<string> {
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
        await logProblem(error, 'createPropertyRequest');
        throw new Error('Failed to submit property request.');
    }
}

export async function getPropertyRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<PropertyRequest[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toPropertyRequest);
    } catch (error) {
        await logProblem(error, 'getPropertyRequests');
        return [];
    }
}
