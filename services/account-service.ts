

'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type { Account, UpdateUserFormValues } from '@/types';

// ---------------------------------------------------------------------------
// Resolve account — the single entry point for establishing an account ID.
//
// Authenticated user:  aid from auth_accounts cookie (passed in by the client)
//   → upsert into DB as a registered-type account, return aid
//
// Guest user:  no aid present
//   → generate track.{randomId}, upsert into DB as guest, return the id
// ---------------------------------------------------------------------------

/**
 * Ensures an account row exists for the given ID and returns it.
 *
 * For authenticated users pass `aid` (from auth_accounts cookie).
 * For guests pass `null` — a new `track.{random}` ID will be generated.
 *
 * @param aid       The account ID from auth_accounts (null for guests)
 * @param ipAddress The request IP for audit purposes
 * @returns         The resolved account ID (aid or the generated track.* id)
 */
export async function resolveAccount(
  aid: string | null,
  ipAddress: string,
): Promise<string> {
  if (aid) {
    // Authenticated — upsert so the row exists, update last access
    await prisma.account.upsert({
      where: { id: aid },
      create: {
        id: aid,
        accountType: 'individual',
        registered: true,
        createdFromIp: ipAddress,
        lastAccessedFromIp: ipAddress,
        createdOn: new Date(),
        accessedOn: new Date(),
      },
      update: {
        accessedOn: new Date(),
        lastAccessedFromIp: ipAddress,
      },
    });
    return aid;
  }

  // Guest — generate a stable track.* ID and upsert
  const guestId = `track.${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 6)}`;
  await prisma.account.create({
    data: {
      id: guestId,
      accountType: 'guest',
      registered: false,
      createdFromIp: ipAddress,
      lastAccessedFromIp: ipAddress,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
  });
  return guestId;
}

/**
 * @deprecated Use resolveAccount() instead.
 * Kept temporarily so the WhatsApp webhook still compiles while it is migrated.
 */
export async function createTemporaryAccount(ipAddress: string): Promise<string> {
  return resolveAccount(null, ipAddress);
}

/**
 * Fetches all accounts from the database.
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
 */
export async function getAccountById(id: string): Promise<Account | null> {
    try {
        const account = await prisma.account.findUnique({ where: { id } });
        return account ? mapPrismaAccountToType(account) : null;
    } catch (error) {
        await logProblem(error, `getAccountById (ID: ${id})`);
        return null;
    }
}

/**
 * Updates a user's profile information.
 */
export async function updateUser(id: string, data: UpdateUserFormValues): Promise<void> {
    try {
        await (prisma as any).account.upsert({
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
 * Updates account access timestamp and IP.
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
