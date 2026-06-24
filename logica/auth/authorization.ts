import { prisma } from "@/logica/core/prisma";
import { getIdentity } from "@/services/neupid/get-identity";
import { cache } from "react";

type AccountPermission = string;
type AccountRole = string[];

function normalizePermissions(raw: unknown): AccountPermission[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value === true)
      .map(([key]) => key);
  }

  return [];
}

const getCurrentAccountRoleIds = cache(async (): Promise<string[]> => {
  const identity = await getIdentity();
  if (!identity.authenticated) return [];

  const [accessRows, account] = await Promise.all([
    prisma.accountAccess.findMany({
      where: { accountId: identity.account.accountId },
      select: { roleId: true },
    }),
    prisma.account.findUnique({
      where: { id: identity.account.accountId },
      select: { roleId: true },
    }),
  ]);

  const roleIds = accessRows.map((row) => row.roleId.trim()).filter(Boolean);
  if (roleIds.length > 0) {
    return [...new Set(roleIds)];
  }

  if (!account?.roleId) return [];
  return [account.roleId];
});

// Returns the current account's permissions.
export const getAccountsPermission = cache(async (): Promise<AccountPermission[]> => {
  const roleIds = await getCurrentAccountRoleIds();
  if (roleIds.length === 0) return [];

  const roles = await prisma.authzRole.findMany({
    where: { id: { in: roleIds } },
    select: { permissions: true },
  });

  return [...new Set(roles.flatMap((role) => normalizePermissions(role.permissions)))];
});

// Returns the current account's roles.
export async function getAccountRole(): Promise<AccountRole> {
  return getCurrentAccountRoleIds();
}

export async function hasPermission(permission: string): Promise<boolean> {
  if (!permission?.trim()) return false;
  const permissions = await getAccountsPermission();
  return permissions.includes(permission);
}

export async function requirePermission(permission: string): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw Object.assign(new Error("Forbidden"), {
      code: "FORBIDDEN",
      permission,
    });
  }
}

// Checks whether a specific account can perform a given action.
export async function canAccountDoThis(
  accountId: string,
  action: string
): Promise<boolean> {
  if (!accountId?.trim() || !action?.trim()) {
    return false;
  }

  const [accessRows, account] = await Promise.all([
    prisma.accountAccess.findMany({
      where: { accountId },
      select: { roleId: true },
    }),
    prisma.account.findUnique({
      where: { id: accountId },
      select: { roleId: true },
    }),
  ]);
  const roleIds = accessRows.map((row) => row.roleId.trim()).filter(Boolean);
  const resolvedRoleIds =
    roleIds.length > 0 ? [...new Set(roleIds)] : account?.roleId ? [account.roleId] : [];
  if (resolvedRoleIds.length === 0) return false;

  const roles = await prisma.authzRole.findMany({
    where: { id: { in: resolvedRoleIds } },
    select: { permissions: true },
  });

  const permissions = [...new Set(roles.flatMap((role) => normalizePermissions(role.permissions)))];
  return permissions.includes(action);
}
