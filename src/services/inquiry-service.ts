
'use server';

import { getFirestore } from '@/lib/firebase';
import type { Inquiry, CreateInquiryFormValues, InquiryStatus } from '@/types';
import { getPropertyById } from './property-service';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'inquiries';

// Helper to convert Firestore doc to Inquiry type
function toInquiry(doc: FirebaseFirestore.DocumentSnapshot): Inquiry {
    const data = doc.data()!;
    return {
        id: doc.id,
        propertyId: data.propertyId,
        propertyTitle: data.propertyTitle,
        agentName: data.agentName,
        name: data.name,
        email: data.email,
        phone: data.phone,
        question: data.question,
        createdAt: data.createdAt.toDate().toISOString(),
        status: data.status || 'new',
    };
}

export async function createInquiry(data: CreateInquiryFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    try {
        // Fetch property to denormalize some data for easier display
        const property = await getPropertyById(data.propertyId);
        if (!property) {
            throw new Error(`Property with ID ${data.propertyId} not found.`);
        }

        const inquiryData = {
            ...data,
            propertyTitle: property.title,
            agentName: property.listingAgent || property.agency.name, // Use listing agent or fall back to agency name
            createdAt: new Date(),
            status: 'new',
        };

        const docRef = await firestore.collection(COLLECTION_NAME).add(inquiryData);
        return docRef.id;
    } catch (error) {
        await logProblem(error, 'createInquiry');
        throw new Error('Failed to submit inquiry.');
    }
}

export async function getInquiries({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Inquiry[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toInquiry);
    } catch (error) {
        await logProblem(error, 'getInquiries');
        return [];
    }
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        await firestore.collection(COLLECTION_NAME).doc(id).update({ status });
    } catch (error) {
        await logProblem(error, `updateInquiryStatus (ID: ${id})`);
        throw new Error('Failed to update inquiry status.');
    }
}
