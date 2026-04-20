

'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type { Account, User, UpdateUserFormValues } from '@/types';

/**
 * Creates a new temporary account for an anonymous user.
 * @returns The unique ID of the newly created account.
 */
export async function createTemporaryAccount(ipAddress: string): Promise<string> {
    try {
        const account = await prisma.account.create({
            data: {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdFromIp: ipAddress,
                lastAccessedFromIp: ipAddress,
                createdOn: new Date(),
                accessedOn: new Date(),
                registered: false,
                accountType: 'guest',
            },
        });
        return account.id;
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
        const accounts = await prisma.account.findMany();
        return accounts.map(mapPrismaAccountToType);
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
        const account = await prisma.account.findUnique({
            where: { id },
        });
        return account ? mapPrismaAccountToType(account) : null;
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
        await prisma.user.upsert({
            where: { id },
            create: {
                id,
                name: data.name || 'User',
                email: data.email || [],
                phone: data.phone || [],
                location: data.location || null,
            },
            update: {
                name: data.name,
                email: data.email || [],
                phone: data.phone || [],
                location: data.location || null,
                lastLogin: new Date(),
            },
        });
    } catch (error) {
        await logProblem(error, `updateUser service (ID: ${id})`);
        throw new Error("Failed to update user in the database.");
    }
}

/**
 * Updates account access timestamp.
 * @param id The account ID.
 * @param ipAddress The IP address from which account was accessed.
 */
export async function updateAccountAccess(id: string, ipAddress: string): Promise<void> {
    try {
        await prisma.account.update({
            where: { id },
            data: {
                accessedOn: new Date(),
                lastAccessedFromIp: ipAddress,
            },
        });
    } catch (error) {
        await logProblem(error, `updateAccountAccess (ID: ${id})`);
    }
}

/**
 * Maps Prisma Account to Account type.
 */
function mapPrismaAccountToType(account: any): Account {
    const baseAccount = {
        id: account.id,
        created_on: account.createdOn?.toISOString() || new Date().toISOString(),
        accessed_on: account.accessedOn?.toISOString() || new Date().toISOString(),
        created_from_ip: account.createdFromIp,
        last_accessed_from_ip: account.lastAccessedFromIp,
    };

    if (account.registered) {
        return {
            ...baseAccount,
            registered: true,
            account_type: account.accountType as 'brand' | 'individual' | 'dependent',
        };
    } else {
        return {
            ...baseAccount,
            registered: false,
            account_type: 'guest' as const,
            name: account.name || undefined,
            location: account.location || undefined,
        };
    }
}
