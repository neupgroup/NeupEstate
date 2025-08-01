

'use server';

import { getDbAdapter } from '@/lib/database';
import { logProblem } from './problem-service';
import type { Account, User, UpdateUserFormValues } from '@/types';

/**
 * Creates a new temporary account for an anonymous user.
 * @returns The unique ID of the newly created account.
 */
export async function createTemporaryAccount(ipAddress: string): Promise<string> {
    try {
        const db = getDbAdapter();
        const accountId = await db.createTemporaryAccount(ipAddress);
        return accountId;
    } catch (error) {
        await logProblem(error, 'createTemporaryAccount');
        throw new Error("Failed to create temporary account in the database.");
    }
}

/**
 * Fetches all accounts from the database.
 * @returns A promise that resolves to an array of Account objects.
 */
export async function getAccounts(): Promise<Account[]> {
    try {
        const db = getDbAdapter();
        return await db.getAccounts();
    } catch (error) {
        await logProblem(error, 'getAccounts');
        return [];
    }
}

/**
 * Fetches a single account by its ID.
 * @param id The ID of the account to fetch.
 * @returns A promise that resolves to an Account object or null if not found.
 */
export async function getAccountById(id: string): Promise<Account | null> {
    try {
        const db = getDbAdapter();
        return await db.getAccountById(id);
    } catch (error) {
        await logProblem(error, `getAccountById (ID: ${id})`);
        return null;
    }
}

/**
 * Updates a user's profile information.
 * @param id The ID of the user to update.
 * @param data The user data to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateUser(id: string, data: UpdateUserFormValues): Promise<void> {
    try {
        const db = getDbAdapter();
        // The adapter method needs to be implemented.
        // Assuming a method like `updateUser` exists on the adapter.
        if ('updateUser' in db && typeof db.updateUser === 'function') {
             await db.updateUser(id, data);
        } else {
            throw new Error("updateUser method not implemented on the current database adapter.");
        }
    } catch (error) {
        await logProblem(error, `updateUser service (ID: ${id})`);
        throw new Error("Failed to update user in the database.");
    }
}
