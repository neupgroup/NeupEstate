

'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { logProblem } from './problem-service';
import { getAccountInformation, getSignedAccountInformation } from '@/services/account/lookup';
import type { Account } from '@/types';
import { resolveStoredAccountType } from '@/services/account-type';

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
        accountType: resolveStoredAccountType({ remoteAccountType: 'individual' }),
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
    neup_id: account.neupId ?? null,
    created_on: account.createdOn?.toISOString() ?? new Date().toISOString(),
    accessed_on: account.accessedOn?.toISOString() ?? new Date().toISOString(),
    display_name:  account.displayName  ?? undefined,
    display_image: account.displayImage ?? undefined,
    agency: account.agency ?? null,
    agent: account.agent ?? null,
  };

  if (account.accountType !== 'guest') {
    return {
      ...base,
      registered: true,
      account_type: account.accountType as
        | 'brand'
        | 'brand.agency'
        | 'subbrand'
        | 'subbrand.agency'
        | 'individual'
        | 'individual.worker'
        | 'individual.agent'
        | 'dependent',
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
  roleIds: string[];
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

    const remoteRoles = extractRemoteRoles(info.meta.response?.body);
    const displayName  = info.account.displayName  || null;
    const displayImage = info.account.displayImage || null;
    const primaryRoleId = remoteRoles[0]?.id ?? null;
    const appId = process.env.NEUP_APP_ID ?? 'neup.estate';

    await prisma.$transaction(async (tx) => {
      for (const remoteRole of remoteRoles) {
        await tx.authzRole.upsert({
          where: { id: remoteRole.id },
          update: {
            name: remoteRole.name,
            appId,
            description: remoteRole.description,
            scope: remoteRole.scope,
            acquisitionType: remoteRole.acquisitionType,
            approvalPolicy: remoteRole.approvalPolicy,
            applicableFor: normalizeJsonValue(remoteRole.applicableFor ?? []) ?? Prisma.JsonNull,
            permissions: normalizeJsonValue(remoteRole.permissions) ?? Prisma.JsonNull,
          },
          create: {
            id: remoteRole.id,
            name: remoteRole.name,
            appId,
            description: remoteRole.description,
            scope: remoteRole.scope,
            acquisitionType: remoteRole.acquisitionType,
            approvalPolicy: remoteRole.approvalPolicy,
            applicableFor: normalizeJsonValue(remoteRole.applicableFor ?? []) ?? Prisma.JsonNull,
            permissions: normalizeJsonValue(remoteRole.permissions) ?? Prisma.JsonNull,
          },
        });
      }

      await tx.account.update({
        where: { id },
        data: {
          displayName,
          displayImage,
          roleId: primaryRoleId,
        },
      });

      await tx.accountAccess.deleteMany({
        where: {
          accountId: id,
          appId,
        },
      });

      if (remoteRoles.length > 0) {
        await tx.accountAccess.createMany({
          data: remoteRoles.map((role) => ({
            accountId: id,
            appId,
            roleId: role.id,
          })),
          skipDuplicates: true,
        });
      }
    });

    const syncedAccessRows = await prisma.accountAccess.findMany({
      where: { accountId: id },
      select: {
        roleId: true,
        role: {
          select: {
            permissions: true,
          },
        },
      },
    });
    const permissions = [
      ...new Set(
        syncedAccessRows.flatMap((row) => normalizePermissions(row.role?.permissions))
      ),
    ];

    return {
      displayName,
      displayImage,
      roleIds: syncedAccessRows.map((row) => row.roleId),
      permissions,
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
  acquisitionType?: unknown;
  approvalPolicy?: unknown;
  applicableFor?: unknown;
  permissions?: unknown;
};

type LookupBody = {
  role?: unknown;
  roles?: unknown;
  access?: unknown;
  permissions?: unknown;
  profile?: {
    role?: unknown;
    roles?: unknown;
  } | null;
} | null;

type NormalizedRemoteRole = {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  acquisitionType: string | null;
  approvalPolicy: string | null;
  applicableFor: string[];
  permissions: string[];
};

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

function extractRemoteRoles(body: unknown): NormalizedRemoteRole[] {
  const payload = body as LookupBody;
  const candidates = [
    payload?.profile?.roles,
    payload?.profile?.role,
    payload?.roles,
    payload?.role,
  ];

  const normalized = candidates.flatMap((candidate) =>
    Array.isArray(candidate) ? candidate : candidate ? [candidate] : []
  );

  const roles = normalized
    .map((role): NormalizedRemoteRole | null => {
      if (typeof role === 'string') {
        const id = asString(role);
        return id
          ? {
              id,
              name: id,
              description: null,
              scope: null,
              acquisitionType: null,
              approvalPolicy: null,
              applicableFor: [],
              permissions: [],
            }
          : null;
      }

      const record = role as LookupRole | null | undefined;
      const id = asString(record?.id);
      if (!id) return null;

      return {
        id,
        name: asString(record?.name) ?? id,
        description: asString(record?.description),
        scope: asString(record?.scope),
        acquisitionType: asString(record?.acquisitionType),
        approvalPolicy: asString(record?.approvalPolicy),
        applicableFor: Array.isArray(record?.applicableFor)
          ? record.applicableFor.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          : [],
        permissions: normalizePermissions(record?.permissions),
      };
    })
    .filter((role): role is NormalizedRemoteRole => Boolean(role));

  return Array.from(new Map(roles.map((role) => [role.id, role])).values());
}

/**
 * Delete an account and all locally-stored data associated with it.
 * Best-effort: removes entries from common tables that reference the account id,
 * then deletes the account row.
 */
export async function deleteAccountAndData(id: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.accountAccess.deleteMany({ where: { accountId: id } }),
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
