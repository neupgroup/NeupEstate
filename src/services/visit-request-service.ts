
'use server';

import { getFirestore } from '@/lib/firebase';
import type { VisitRequest, CreateVisitRequestFormValues } from '@/types';
import { getPropertyById } from './property-service';
import { getAgentById } from './agent-service';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'visitRequests';

function toVisitRequest(doc: FirebaseFirestore.DocumentSnapshot): VisitRequest {
    const data = doc.data()!;
    return {
        id: doc.id,
        propertyId: data.propertyId,
        propertyTitle: data.propertyTitle,
        agentId: data.agentId,
        agentName: data.agentName,
        name: data.name,
        email: data.email,
        phone: data.phone,
        preferred_date: data.preferred_date,
        preferred_time: data.preferred_time,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createVisitRequest(data: CreateVisitRequestFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    try {
        const property = await getPropertyById(data.propertyId);
        if (!property || !property.listingAgent) {
            throw new Error(`Property or its listing agent not found.`);
        }
        
        // In a real app, you'd look up the agent by name. Here we assume name is unique or first match is fine.
        // This is a simplification. A real app should use agent IDs.
        const agent = await getAgentById(property.listingAgent);
        if (!agent) {
             throw new Error(`Agent with ID ${property.listingAgent} not found.`);
        }


        const requestData = {
            ...data,
            propertyTitle: property.title,
            agentId: agent.id,
            agentName: agent.name,
            createdAt: new Date(),
            status: 'new',
        };

        const docRef = await firestore.collection(COLLECTION_NAME).add(requestData);
        return docRef.id;
    } catch (error) {
        await logProblem(error, 'createVisitRequest');
        throw new Error('Failed to submit visit request.');
    }
}

export async function getVisitRequests({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<VisitRequest[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toVisitRequest);
    } catch (error) {
        await logProblem(error, 'getVisitRequests');
        return [];
    }
}
