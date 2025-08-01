

'use server';

import { getFirestore } from '@/lib/firebase';
import type { Property, PropertyActivityEvent, UserPreferences } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'preferences';

const WEIGHTS = {
    view: 1,
    save: 10,
    share: 8,
    call: 15,
    inquiry: 12,
    visit_request: 20,
    mortgage_request: 25,
};

function getBudgetRange(price: number): string {
    const step = 50000;
    const lower = Math.floor(price / step) * step;
    const upper = lower + step;
    return `${lower}-${upper}`;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const firestore = getFirestore();
    if (!firestore) return null;

    try {
        const docRef = await firestore.collection(COLLECTION_NAME).doc(userId).get();
        if (!docRef.exists) {
            return null;
        }
        const data = docRef.data();
        if (!data) return null;

        // Convert Firestore Timestamp to a serializable ISO string
        return {
            ...data,
            updatedAt: data.updatedAt.toDate().toISOString(),
        } as UserPreferences;

    } catch (error) {
        await logProblem(error, `getUserPreferences (User: ${userId})`);
        return null;
    }
}

export async function updateUserPreferences(
    userId: string,
    property: Property,
    events: PropertyActivityEvent[]
): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) {
        console.error("Firestore not available. Cannot update user preferences.");
        return;
    }

    const preferenceRef = firestore.collection(COLLECTION_NAME).doc(userId);

    try {
        const updates: { [key: string]: FieldValue } = {};
        
        let totalViewDuration = 0;
        let hasPersistentAction = false;

        for (const event of events) {
            const weight = WEIGHTS[event.type] || 0;
            if (event.type === 'view') {
                totalViewDuration += event.duration || 0;
            } else {
                hasPersistentAction = true;
                 updates[`total${event.type.charAt(0).toUpperCase() + event.type.slice(1)}s`] = FieldValue.increment(1);
            }

            if (weight === 0 && event.type !== 'view') continue;

            // Update location preference
            if (property.location) {
                updates[`preferences.location.${property.location}.${event.type}`] = FieldValue.increment(weight);
            }
            // Update district preference
            if (property.structuredLocation?.district) {
                 updates[`preferences.district.${property.structuredLocation.district}.${event.type}`] = FieldValue.increment(weight);
            }
            // Update budget range preference
            if (property.price > 0) {
                const budgetRange = getBudgetRange(property.price);
                updates[`preferences.budget_range.${budgetRange}.${event.type}`] = FieldValue.increment(weight);
            }
            // Update type preference
            if (property.type) {
                updates[`preferences.type.${property.type}.${event.type}`] = FieldValue.increment(weight);
            }
             // Update category preference
            if (property.category) {
                updates[`preferences.category.${property.category}.${event.type}`] = FieldValue.increment(weight);
            }
        }
        
        // Add total view duration to a separate field
        if (totalViewDuration > 0) {
            updates['totalTimeSpentInSeconds'] = FieldValue.increment(totalViewDuration);
        }

        // Handle view weight calculation based on overall interaction
        if (totalViewDuration >= 60 || (hasPersistentAction && totalViewDuration > 0)) {
            const viewWeight = Math.ceil(totalViewDuration / 60); // 1 point per minute
             if (property.location) updates[`preferences.location.${property.location}.view`] = FieldValue.increment(viewWeight);
             if (property.structuredLocation?.district) updates[`preferences.district.${property.structuredLocation.district}.view`] = FieldValue.increment(viewWeight);
             if (property.price > 0) {
                const budgetRange = getBudgetRange(property.price);
                updates[`preferences.budget_range.${budgetRange}.view`] = FieldValue.increment(viewWeight);
             }
             if (property.type) updates[`preferences.type.${property.type}.view`] = FieldValue.increment(viewWeight);
             if (property.category) updates[`preferences.category.${property.category}.view`] = FieldValue.increment(viewWeight);
        }

        if (Object.keys(updates).length > 0) {
            await preferenceRef.set({ 
                userId,
                updatedAt: new Date(),
             }, { merge: true });
            await preferenceRef.update(updates);
        }

    } catch (error) {
        await logProblem(error, `updateUserPreferences (User: ${userId})`);
    }
}
