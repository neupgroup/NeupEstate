

'use server';

import { prisma } from '@/lib/prisma';
import { logProblem } from './problem-service';
import { getAccountInformation } from '@/services/account/lookup';
import type { Account } from '@/types';

/**
 * Ensures an account row exists for the given ssid and returns it.
 *
 * For authenticated users pass the ssid (aid from auth_accounts cookie).
 * For guests pass null — a new track.{random} ID will be generated.
 *
 * On first create for a registered account, fetches displayName and
 * displayImage from NeupID and stores them for fast local access.
 *
 * @param aid       The ssid from auth_accounts (null for guests)
 * @returns         The resolved account ID
 */
export async function resolveAccount(
  aid: string | null,
): Promise<string> {
  if (aid) {
    // Check if the account already exists
    const existing = await prisma.account.findUnique({ where: { id: aid } });

    if (existing) {
      // Already exists — just bump accessedOn
      await prisma.account.update({
        where: { id: aid },
        data: { accessedOn: new Date() },
      });
      return aid;
    }

    // First time — fetch display info from NeupID before creating the row
    let displayName: string | undefined;
    let displayImage: string | undefined;

    try {
      const info = await getAccountInformation({ accountId: aid });
      if (info.found) {
        displayName  = info.account.displayName  || undefined;
        displayImage = info.account.displayImage || undefined;
      }
    } catch {
      // Non-fatal — proceed without display info if NeupID is unreachable
    }

    await prisma.account.create({
      data: {
        id: aid,
        accountType: 'individual',
        createdOn: new Date(),
        accessedOn: new Date(),
        displayName:  displayName  ?? null,
        displayImage: displayImage ?? null,
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
    display_name:  account.displayName  ?? undefined,
    display_image: account.displayImage ?? undefined,
  };

  if (account.accountType !== 'guest') {
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

// Keep updateUser for backward compat — now updates account display fields used by manage/users/[id].
export async function updateUser(id: string, data: any): Promise<void> {
  const nextDisplayName =
    typeof data?.name === 'string' && data.name.trim().length > 0
      ? data.name.trim()
      : undefined;

  await prisma.account.update({
    where: { id },
    data: {
      ...(nextDisplayName ? { displayName: nextDisplayName } : {}),
      accessedOn: new Date(),
    },
  });
}

/**
 * Fetches the latest displayName and displayImage from NeupID and writes
 * them back to the local account row.
 *
 * Returns the updated fields, or null if the lookup failed.
 */
export async function refreshAccountDisplayInfo(
  id: string,
): Promise<{ displayName: string | null; displayImage: string | null } | null> {
  try {
    const info = await getAccountInformation({ accountId: id });
    if (!info.found) {
      await logProblem(
        new Error(`NeupID lookup failed while refreshing account: ${info.error}`),
        `refreshAccountDisplayInfo (ID: ${id})`,
        {
          accountId: id,
          lookupError: info.error,
          request: info.meta.request,
          response: info.meta.response ?? null,
        },
      );
      return null;
    }

    const displayName  = info.account.displayName  || null;
    const displayImage = info.account.displayImage || null;

    await prisma.account.update({
      where: { id },
      data: { displayName, displayImage },
    });

    return { displayName, displayImage };
  } catch (error) {
    await logProblem(error, `refreshAccountDisplayInfo (ID: ${id})`);
    return null;
  }
}
