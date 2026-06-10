

'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import { getAccountInformation, getSignedAccountInformation } from '@/services/account/lookup';
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
      const info = await getSignedAccountInformation();
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
 * Fetches the latest profile and access data from NeupID and writes it back
 * to the local account row and linked authz role.
 *
 * Returns the updated fields, or null if the lookup failed.
 */
export async function refreshAccountDisplayInfo(
  id: string,
): Promise<{
  displayName: string | null;
  displayImage: string | null;
  roleId: string | null;
  permissions: string[];
} | null> {
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

    const remoteRole = extractRemoteRole(info.meta.response?.body);
    const displayName  = info.account.displayName  || null;
    const displayImage = info.account.displayImage || null;
    const remoteRoleId = remoteRole?.id ?? null;
    const remotePermissions = remoteRole?.permissions ?? [];

    await prisma.$transaction(async (tx) => {
      if (remoteRole) {
        const existingRole = await tx.authzRole.findUnique({
          where: { id: remoteRole.id },
          select: {
            appId: true,
            description: true,
            scope: true,
          },
        });

        const appId = existingRole?.appId ?? process.env.NEUP_APP_ID ?? 'neup.estate';

        await tx.authzRole.upsert({
          where: { id: remoteRole.id },
          update: {
            name: remoteRole.name ?? remoteRole.id,
            appId,
            description: remoteRole.description ?? existingRole?.description ?? null,
            scope: remoteRole.scope ?? existingRole?.scope ?? null,
            permissions: normalizeJsonValue(remotePermissions) ?? Prisma.JsonNull,
          },
          create: {
            id: remoteRole.id,
            name: remoteRole.name ?? remoteRole.id,
            appId,
            description: remoteRole.description ?? null,
            scope: remoteRole.scope ?? null,
            permissions: normalizeJsonValue(remotePermissions) ?? Prisma.JsonNull,
          },
        });
      }

      await tx.account.update({
        where: { id },
        data: {
          displayName,
          displayImage,
          ...(remoteRoleId ? { roleId: remoteRoleId } : {}),
        },
      });
    });

    const syncedAccount = await prisma.account.findUnique({
      where: { id },
      select: {
        roleId: true,
        role: {
          select: {
            permissions: true,
          },
        },
      },
    });

    const permissions = normalizePermissions(syncedAccount?.role?.permissions);

    return {
      displayName,
      displayImage,
      roleId: syncedAccount?.roleId ?? null,
      permissions: normalizePermissions(syncedAccount?.role?.permissions),
    };
  } catch (error) {
    await logProblem(error, `refreshAccountDisplayInfo (ID: ${id})`);
    return null;
  }
}

type LookupRole = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  scope?: unknown;
  permissions?: unknown;
};

type LookupBody = {
  role?: unknown;
  access?: unknown;
  permissions?: unknown;
  profile?: {
    role?: unknown;
  } | null;
} | null;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizePermissions(raw: unknown): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value === true)
      .map(([key]) => key)
      .filter((permission) => permission.trim().length > 0);
  }

  return [];
}

function normalizeJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function extractRemoteRole(body: unknown): {
  id: string;
  name: string | null;
  description: string | null;
  scope: string | null;
  permissions: string[];
} | null {
  const payload = body as LookupBody;
  const profileRole = payload?.profile?.role;
  const fromProfile = Array.isArray(profileRole) ? profileRole[0] : null;
  const fromRoot = payload?.role;

  const role = (fromProfile ?? fromRoot) as LookupRole | string | null | undefined;
  if (!role) return null;

  if (typeof role === 'string') {
    const id = asString(role);
    return id
      ? {
          id,
          name: id,
          description: null,
          scope: null,
          permissions: [],
        }
      : null;
  }

  const id = asString(role.id);
  if (!id) return null;

  return {
    id,
    name: asString(role.name) ?? id,
    description: asString(role.description),
    scope: asString(role.scope),
    permissions: normalizePermissions(role.permissions),
  };
}

/**
 * Delete an account and all locally-stored data associated with it.
 * Best-effort: removes entries from common tables that reference the account id,
 * then deletes the account row.
 */
export async function deleteAccountAndData(id: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.authzAccountAccessGrant.deleteMany({ where: { OR: [{ ownerAccountId: id }, { targetAccountId: id }] } }),
      prisma.authzAssetsAccessGrant.deleteMany({ where: { accountId: id } }),
      prisma.agencyAgentMap.deleteMany({ where: { OR: [{ agencyId: id }, { agentId: id }] } }),
      prisma.agencyMap.deleteMany({ where: { OR: [{ accountId: id }, { agencyAccountId: id }] } }),
      prisma.conversation.deleteMany({ where: { accountId: id } }),
      prisma.requirement.deleteMany({ where: { userId: id } }),
      prisma.savedProperty.deleteMany({ where: { accountId: id } }),
      prisma.propertyView.deleteMany({ where: { accountId: id } }),
      prisma.reactedProperty.deleteMany({ where: { trackedId: id } }),
      prisma.userPreference.deleteMany({ where: { accountId: id } }),
      prisma.activity.deleteMany({ where: { trackerId: id } }),
      prisma.clientLink.deleteMany({ where: { trackerId: id } }),
      prisma.account.delete({ where: { id } }),
    ]);
  } catch (e) {
    await logProblem(e, `deleteAccountAndData (ID: ${id})`);
    throw new Error('Failed to delete account and related data.');
  }
}
