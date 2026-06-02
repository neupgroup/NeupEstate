import { prisma } from "@/lib/prisma";
import { getIdentity } from "@/services/neupid/get-identity";
import { cache } from "react";

type AccountPermission = string;
type AccountRole = string | null;

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

const getCurrentAccountRoleId = cache(async (): Promise<string | null> => {
  const identity = await getIdentity();
  if (!identity.authenticated) return null;

  const account = await prisma.account.findUnique({
    where: { id: identity.account.accountId },
    select: { roleId: true },
  });

  return account?.roleId ?? null;
});

// Returns the current account's permissions.
export const getAccountsPermission = cache(async (): Promise<AccountPermission[]> => {
  const roleId = await getCurrentAccountRoleId();
  if (!roleId) return [];

  const role = await prisma.authzRole.findUnique({
    where: { id: roleId },
    select: { permissions: true },
  });

  return normalizePermissions(role?.permissions);
});

// Returns the current account's role.
export async function getAccountRole(): Promise<AccountRole> {
  return getCurrentAccountRoleId();
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

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { roleId: true },
  });
  if (!account?.roleId) return false;

  const role = await prisma.authzRole.findUnique({
    where: { id: account.roleId },
    select: { permissions: true },
  });

  const permissions = normalizePermissions(role?.permissions);
  return permissions.includes(action);
}
