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

// Replace an account's role grants for one app using role IDs as the grant data.
export async function replaceAccountRoleGrants(
  accountIds: string[],
  appId: string,
  roles: SyncedAccountRole[],
  db: GrantDbClient = prisma,
): Promise<void> {
  const uniqueAccountIds = [...new Set(accountIds.filter(Boolean))];
  const roleIds = roles.map((role) => role.id);
  for (const accountId of uniqueAccountIds) {
    const currentGrants = await db.authzAccountAccessGrant.findMany({
      where: { ownerAccountId: accountId, targetAccountId: accountId },
      select: { id: true, roleId: true },
    });
    const currentRoleIds = [...new Set(currentGrants.map((grant) => grant.roleId))];
    const appRoles = currentRoleIds.length > 0
      ? await db.authzRole.findMany({
          where: { id: { in: currentRoleIds }, appId },
          select: { id: true },
        })
      : [];
    const appRoleIds = new Set(appRoles.map((role) => role.id));
    const obsoleteIds = currentGrants.filter((grant) => appRoleIds.has(grant.roleId)).map((grant) => grant.id);

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
      })),
    });
  }
}
