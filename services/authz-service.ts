import { prisma } from '@/core/database/prisma';
import { Prisma, PrismaClient } from '@/core/database/prisma';
import { logProblem } from './problem-service';

// ============================================================================
// Types
// ============================================================================

export type AuthzTable =
  | 'authz_role_capability'
  | 'authz_account_access_grant'
  | 'authz_assets_access_grant';

type AuthzDbClient = PrismaClient | Prisma.TransactionClient;

// ============================================================================
// authz_role_capability
// ============================================================================

export async function insertRoleCapability(data: {
  roleId: string;
  capabilityId: string;
  scope?: string | null;
  denormalizedCapability?: Prisma.InputJsonValue | null;
  roleName?: string | null;
}, db: AuthzDbClient = prisma): Promise<string> {
  try {
    const record = await db.roleCapability.create({
      data: {
        ...data,
        denormalizedCapability:
          data.denormalizedCapability === null
            ? Prisma.DbNull
            : data.denormalizedCapability,
      },
    });
    return record.id;
  } catch (e) {
    await logProblem(e, 'authz:insertRoleCapability');
    throw new Error('Failed to insert role capability.');
  }
}

export async function updateRoleCapability(
  id: string,
  data: Partial<{
    roleId: string;
    capabilityId: string;
    scope: string | null;
    denormalizedCapability: Prisma.InputJsonValue | null;
    roleName: string | null;
  }>,
  db: AuthzDbClient = prisma,
): Promise<void> {
  try {
    await db.roleCapability.update({
      where: { id },
      data: {
        ...(data.roleId !== undefined        && { roleId: data.roleId }),
        ...(data.capabilityId !== undefined  && { capabilityId: data.capabilityId }),
        ...(data.scope !== undefined         && { scope: data.scope }),
        ...(data.roleName !== undefined      && { roleName: data.roleName }),
        ...(Object.prototype.hasOwnProperty.call(data, 'denormalizedCapability') && {
          denormalizedCapability:
            data.denormalizedCapability === null
              ? Prisma.DbNull
              : data.denormalizedCapability,
        }),
      },
    });
  } catch (e) {
    await logProblem(e, `authz:updateRoleCapability ${id}`);
    throw new Error('Failed to update role capability.');
  }
}

export async function deleteRoleCapability(id: string, db: AuthzDbClient = prisma): Promise<void> {
  try {
    await db.roleCapability.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `authz:deleteRoleCapability ${id}`);
    throw new Error('Failed to delete role capability.');
  }
}

export async function deleteRoleCapabilities(ids: string[], db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.roleCapability.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteRoleCapabilities');
    throw new Error('Failed to bulk delete role capabilities.');
  }
}

export async function deleteAllRoleCapabilities(db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.roleCapability.deleteMany();
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteAllRoleCapabilities');
    throw new Error('Failed to truncate role capabilities.');
  }
}

// ============================================================================
// authz_account_access_grant
// ============================================================================

export async function insertAccountAccessGrant(data: {
  ownerAccountId: string;
  targetAccountId: string;
  roleId: string;
  portfolioId?: string | null;
}, db: AuthzDbClient = prisma): Promise<string> {
  try {
    const record = await db.authzAccountAccessGrant.create({ data });
    return record.id;
  } catch (e) {
    await logProblem(e, 'authz:insertAccountAccessGrant');
    throw new Error('Failed to insert account access grant.');
  }
}

export async function updateAccountAccessGrant(
  id: string,
  data: Partial<{
    ownerAccountId: string;
    targetAccountId: string;
    roleId: string;
    portfolioId: string | null;
  }>,
  db: AuthzDbClient = prisma,
): Promise<void> {
  try {
    await db.authzAccountAccessGrant.update({ where: { id }, data });
  } catch (e) {
    await logProblem(e, `authz:updateAccountAccessGrant ${id}`);
    throw new Error('Failed to update account access grant.');
  }
}

export async function deleteAccountAccessGrant(id: string, db: AuthzDbClient = prisma): Promise<void> {
  try {
    await db.authzAccountAccessGrant.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `authz:deleteAccountAccessGrant ${id}`);
    throw new Error('Failed to delete account access grant.');
  }
}

export async function deleteAccountAccessGrants(ids: string[], db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.authzAccountAccessGrant.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteAccountAccessGrants');
    throw new Error('Failed to bulk delete account access grants.');
  }
}

export async function deleteAllAccountAccessGrants(db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.authzAccountAccessGrant.deleteMany();
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteAllAccountAccessGrants');
    throw new Error('Failed to truncate account access grants.');
  }
}

// ============================================================================
// authz_assets_access_grant
// ============================================================================

export async function insertAssetsAccessGrant(data: {
  assetId: string;
  accountId: string;
  roleId: string;
  portfolioId?: string | null;
  assetType?: string | null;
}, db: AuthzDbClient = prisma): Promise<string> {
  try {
    const record = await db.authzAssetsAccessGrant.create({ data });
    return record.id;
  } catch (e) {
    await logProblem(e, 'authz:insertAssetsAccessGrant');
    throw new Error('Failed to insert assets access grant.');
  }
}

export async function updateAssetsAccessGrant(
  id: string,
  data: Partial<{
    assetId: string;
    accountId: string;
    roleId: string;
    portfolioId: string | null;
    assetType: string | null;
  }>,
  db: AuthzDbClient = prisma,
): Promise<void> {
  try {
    await db.authzAssetsAccessGrant.update({ where: { id }, data });
  } catch (e) {
    await logProblem(e, `authz:updateAssetsAccessGrant ${id}`);
    throw new Error('Failed to update assets access grant.');
  }
}

export async function deleteAssetsAccessGrant(id: string, db: AuthzDbClient = prisma): Promise<void> {
  try {
    await db.authzAssetsAccessGrant.delete({ where: { id } });
  } catch (e) {
    await logProblem(e, `authz:deleteAssetsAccessGrant ${id}`);
    throw new Error('Failed to delete assets access grant.');
  }
}

export async function deleteAssetsAccessGrants(ids: string[], db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.authzAssetsAccessGrant.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteAssetsAccessGrants');
    throw new Error('Failed to bulk delete assets access grants.');
  }
}

export async function deleteAllAssetsAccessGrants(db: AuthzDbClient = prisma): Promise<number> {
  try {
    const result = await db.authzAssetsAccessGrant.deleteMany();
    return result.count;
  } catch (e) {
    await logProblem(e, 'authz:deleteAllAssetsAccessGrants');
    throw new Error('Failed to truncate assets access grants.');
  }
}
