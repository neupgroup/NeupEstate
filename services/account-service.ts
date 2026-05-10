

'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import type { Account } from '@/types';

/**
 * Ensures an account row exists for the given ssid and returns it.
 *
 * For authenticated users pass the ssid (aid from auth_accounts cookie).
 * For guests pass null — a new track.{random} ID will be generated.
 *
 * @param aid       The ssid from auth_accounts (null for guests)
 * @returns         The resolved account ID
 */
export async function resolveAccount(
  aid: string | null,
): Promise<string> {
  if (aid) {
    await prisma.account.upsert({
      where: { id: aid },
      create: {
        id: aid,
        accountType: 'individual',
        registered: true,
        createdOn: new Date(),
        accessedOn: new Date(),
      },
      update: {
        accessedOn: new Date(),
      },
    });
    return aid;
  }

  // Guest — generate a stable track.* ID
  const guestId = `track.${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 6)}`;
  await prisma.account.create({
    data: {
      id: guestId,
      accountType: 'guest',
      registered: false,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
  });
  return guestId;
}

/** @deprecated Use resolveAccount() instead. */
export async function createTemporaryAccount(): Promise<string> {
  return resolveAccount(null);
}

export async function getAccounts(): Promise<Account[]> {
  try {
    const accounts = await prisma.account.findMany();
    return accounts.map(mapRecord);
  } catch (error) {
    await logProblem(error, 'getAccounts');
    return [];
  }
}

export async function getAccountById(id: string): Promise<Account | null> {
  try {
    const account = await prisma.account.findUnique({ where: { id } });
    return account ? mapRecord(account) : null;
  } catch (error) {
    await logProblem(error, `getAccountById (ID: ${id})`);
    return null;
  }
}

export async function updateAccountAccessInfo(id: string): Promise<void> {
  try {
    await prisma.account.update({
      where: { id },
      data: { accessedOn: new Date() },
    });
  } catch (error) {
    await logProblem(error, `updateAccountAccessInfo (ID: ${id})`);
  }
}

function mapRecord(account: any): Account {
  const base = {
    id: account.id,
    created_on: account.createdOn?.toISOString() ?? new Date().toISOString(),
    accessed_on: account.accessedOn?.toISOString() ?? new Date().toISOString(),
  };

  if (account.registered) {
    return {
      ...base,
      registered: true,
      account_type: account.accountType as 'brand' | 'individual' | 'dependent',
    };
  }
  return {
    ...base,
    registered: false,
    account_type: 'guest' as const,
  };
}

// Keep updateUser for backward compat — it now only updates accessedOn
export async function updateUser(id: string, _data: any): Promise<void> {
  await updateAccountAccessInfo(id);
}

