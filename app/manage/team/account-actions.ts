'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { getIdentity } from '@/services/neupid/get-identity';
import { createBrandAccountConnection, getBrandAccounts } from '@/services/neupid/get-brand-accounts';
import type { BrandAccount } from '@/services/neupid/get-brand-accounts';
import { resolveStoredAccountType } from '@/services/account-type';

type CreateAccountInput = {
  id: string;
  neupId?: string | null;
  accountType: string;
  displayName: string;
  displayImage: string | null;
};

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createAccountAction(input: CreateAccountInput): Promise<ActionResult> {
  try {
    const remoteConnectionResult = await createBrandAccountConnection(input.id);
    if (!remoteConnectionResult.success) {
      return {
        success: false,
        error: remoteConnectionResult.error,
      };
    }

    const existing = await prisma.account.findUnique({
      where: { id: input.id },
      select: { accountType: true },
    });

    if (existing) {
      await prisma.account.update({
        where: { id: input.id },
        data: {
          neupId: input.neupId?.trim() || null,
          accountType: resolveStoredAccountType({
            remoteAccountType: input.accountType,
            existingAccountType: existing.accountType,
          }),
          displayName: input.displayName,
          displayImage: input.displayImage,
          connectionId: remoteConnectionResult.connectionId,
          accessedOn: new Date(),
        },
      });
      return { success: true };
    }

    await prisma.account.create({
      data: {
        id: input.id,
        neupId: input.neupId?.trim() || null,
        accountType: resolveStoredAccountType({ remoteAccountType: input.accountType }),
        displayName: input.displayName,
        displayImage: input.displayImage,
        connectionId: remoteConnectionResult.connectionId,
      }
    });

    return { success: true };
  } catch (error) {
    await logProblem(error, 'createAccountAction');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account'
    };
  }
}

export async function syncBrandAccountsToLocalAccounts(
  accounts: BrandAccount[],
): Promise<void> {
  const accountsWithNeupId = accounts.filter((account) => account.neupId?.trim());
  if (!accountsWithNeupId.length) return;

  try {
    await Promise.all(
      accountsWithNeupId.map((account) =>
        prisma.account.updateMany({
          where: { id: account.id },
          data: {
            neupId: account.neupId?.trim() || null,
            displayName: account.displayName || null,
            displayImage: account.displayImage || null,
            accessedOn: new Date(),
          },
        }),
      ),
    );

    const existingAccounts = await prisma.account.findMany({
      where: { id: { in: accountsWithNeupId.map((account) => account.id) } },
      select: { id: true, accountType: true },
    });

    const existingTypeById = new Map(existingAccounts.map((account) => [account.id, account.accountType]));

    await Promise.all(
      accountsWithNeupId.map((account) =>
        prisma.account.updateMany({
          where: { id: account.id },
          data: {
            accountType: resolveStoredAccountType({
              remoteAccountType: account.accountType || 'brand',
              existingAccountType: existingTypeById.get(account.id),
            }),
          },
        }),
      ),
    );
  } catch (error) {
    await logProblem(error, 'syncBrandAccountsToLocalAccounts');
  }
}

export async function setWorkingProfileAction(accountId: string): Promise<ActionResult> {
  try {
    const identity = await getIdentity();
    if (!identity.authenticated) {
      return {
        success: false,
        error: 'Authentication required.',
      };
    }

    const actorId = identity.account.accountId;
    const [targetAccount, actorAccount, agencyMembership, brandAccountsResult] = await Promise.all([
      prisma.account.findUnique({ where: { id: accountId }, select: { id: true, connectionId: true } }),
      prisma.account.findUnique({ where: { id: actorId }, select: { id: true } }),
      prisma.agencyMap.findFirst({
        where: {
          accountId: actorId,
          agencyAccountId: accountId,
        },
        select: { id: true },
      }),
      getBrandAccounts(),
    ]);

    if (!targetAccount) {
      return {
        success: false,
        error: 'The selected account does not exist in the local database yet.',
      };
    }

    if (!targetAccount.connectionId?.trim()) {
      return {
        success: false,
        error: 'The selected account has not been created yet.',
      };
    }

    if (!actorAccount) {
      return {
        success: false,
        error: 'Your account is not available in the local database.',
      };
    }

    const hasRemoteAccess =
      brandAccountsResult.success &&
      brandAccountsResult.accounts.some((account) => account.id === accountId);

    const canAccessTarget =
      actorId === accountId ||
      Boolean(agencyMembership) ||
      hasRemoteAccess;

    if (!canAccessTarget) {
      return {
        success: false,
        error: 'You do not have access to set this working profile.',
      };
    }

    await prisma.account.update({
      where: { id: actorId },
      data: {
        workingProfile: accountId,
        accessedOn: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    await logProblem(error, `setWorkingProfileAction ${accountId}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set working profile',
    };
  }
}
