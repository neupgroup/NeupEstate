import { prisma } from '@neup/core/database/prisma';
import type { Prisma, PrismaClient } from '@neup/core/database/prisma';

type GrantDbClient = PrismaClient | Prisma.TransactionClient;

export type SyncedAccountRole = {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  acquisitionType: string | null;
  approvalPolicy: string | null;
  applicableFor: string[];
  permissions: string[];
};

// Replace an account's role grants for one app with the latest synced role snapshots.
export async function replaceAccountRoleGrants(
  accountIds: string[],
  appId: string,
  roles: SyncedAccountRole[],
  db: GrantDbClient = prisma,
): Promise<void> {
  const uniqueAccountIds = [...new Set(accountIds.filter(Boolean))];
  const roleIds = roles.map((role) => role.id);
  const capabilities = roleIds.length > 0
    ? await db.roleCapability.findMany({
        where: { roleId: { in: roleIds } },
        select: {
          id: true,
          roleId: true,
          capabilityId: true,
          scope: true,
          roleName: true,
          denormalizedCapability: true,
        },
      })
    : [];

  for (const accountId of uniqueAccountIds) {
    const currentGrants = await db.authzAccountAccessGrant.findMany({
      where: { ownerAccountId: accountId, targetAccountId: accountId },
      select: { id: true, permissions: true },
    });
    const obsoleteIds = currentGrants
      .filter((grant) => getGrantAppId(grant.permissions) === appId)
      .map((grant) => grant.id);

    if (obsoleteIds.length > 0) {
      await db.authzAccountAccessGrant.deleteMany({ where: { id: { in: obsoleteIds } } });
    }

    if (roles.length === 0) continue;

    await db.authzAccountAccessGrant.createMany({
      data: roles.map((role) => ({
        ownerAccountId: accountId,
        targetAccountId: accountId,
        roleId: role.id,
        portfolioId: null,
        permissions: toJsonValue({
          accountAccess: { appId, updatedOn: new Date().toISOString() },
          role: {
            id: role.id,
            name: role.name,
            description: role.description,
            appId,
            scope: role.scope,
            acquisitionType: role.acquisitionType,
            approvalPolicy: role.approvalPolicy,
            applicableFor: role.applicableFor,
          },
          permissions: role.permissions,
          capabilities: capabilities
            .filter((capability) => capability.roleId === role.id)
            .map((capability) => ({
              id: capability.id,
              capabilityId: capability.capabilityId,
              scope: capability.scope,
              roleName: capability.roleName,
              capability: capability.denormalizedCapability,
            })),
        }),
      })),
    });
  }
}

// Read the app identifier embedded in a grant's permission snapshot.
export function getGrantAppId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const accountAccess = (value as Record<string, unknown>).accountAccess;
  if (!accountAccess || typeof accountAccess !== 'object' || Array.isArray(accountAccess)) return null;
  const appId = (accountAccess as Record<string, unknown>).appId;
  return typeof appId === 'string' ? appId : null;
}

// Remove undefined values before passing permission snapshots to Prisma JSON fields.
function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
