'use server';

import { getFirestore } from '@/lib/firebase';
import type { NewsletterSubscription, CreateNewsletterSubscriptionFormValues } from '@/types';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'newsletterSubscriptions';

function toNewsletterSubscription(doc: FirebaseFirestore.DocumentSnapshot): NewsletterSubscription {
    const data = doc.data()!;
    return {
        id: doc.id,
        email: data.email,
        createdAt: data.createdAt.toDate().toISOString(),
    };
}

export async function createNewsletterSubscription(data: CreateNewsletterSubscriptionFormValues): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) {
        throw new Error('Firestore is not available.');
    }

    const { email } = data;
    
    // Check if email already exists to prevent duplicates
    const existingSub = await firestore.collection(COLLECTION_NAME).where('email', '==', email).limit(1).get();
    if (!existingSub.empty) {
        // Not necessarily an error, just means they're already subscribed.
        console.log(`Email ${email} is already subscribed.`);
        return; 
    }

    try {
        const subscriptionData = {
            email,
            createdAt: new Date(),
        };
        await firestore.collection(COLLECTION_NAME).add(subscriptionData);
    } catch (error) {
        await logProblem(error, `createNewsletterSubscription (email: ${email})`);
        throw new Error('Failed to save subscription to the database.');
    }
}

export async function getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toNewsletterSubscription);
    } catch (error) {
        await logProblem(error, 'getNewsletterSubscriptions');
        return [];
    }
}
