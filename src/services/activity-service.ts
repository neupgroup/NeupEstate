

'use server';

import { getFirestore } from '@/lib/firebase';
import type { CreateUserActivityInput } from '@/types';
import { logProblem } from './problem-service';
import { getDbAdapter } from '@/lib/database';

export async function logActivity(activityData: CreateUserActivityInput): Promise<string> {
    try {
        const firestore = getFirestore();
        if (!firestore) {
            throw new Error('Firestore is not available.');
        }

        const dataToSave = {
            ...activityData,
            activityOn: new Date(activityData.activityOn),
        };

        const docRef = await firestore.collection('activities').add(dataToSave);
        return docRef.id;
    } catch (error: any) {
        // Log the error but don't crash the user-facing operation
        await logProblem(error, 'logActivity');
        return '';
    }
}

/**
 * Updates the last accessed time and IP for a given account.
 * @param accountId The ID of the account to update.
 * @param ipAddress The IP address from the current request.
 */
export async function updateAccountAccessInfo(accountId: string, ipAddress: string): Promise<void> {
    try {
        const db = getDbAdapter();
        if ('updateAccountAccess' in db && typeof db.updateAccountAccess === 'function') {
            await db.updateAccountAccess(accountId, ipAddress);
        } else {
             // Fallback or log if method not implemented on current adapter
             console.warn('updateAccountAccess is not implemented on the current database adapter.');
        }
    } catch (error) {
        await logProblem(error, 'updateAccountAccessInfo');
    }
}
