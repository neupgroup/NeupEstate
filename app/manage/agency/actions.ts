'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { getIdentity } from '@/services/neupid/get-identity';
import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';

type CreateAccountInput = {
  id: string;
  accountType: string;
  displayName: string;
  displayImage: string | null;
};

type SyncAccountInput = {
  id: string;
  displayName: string;
  displayImage: string | null;
};

type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Creates a new account in the local database from a brand account.
 */
export async function createAccountAction(input: CreateAccountInput): Promise<ActionResult> {
  try {
    // Check if account already exists
    const existing = await prisma.account.findUnique({
      where: { id: input.id }
    });

    if (existing) {
      return {
        success: false,
        error: 'Account already exists. Use sync instead.'
      };
    }

    // Create the account
    await prisma.account.create({
      data: {
        id: input.id,
        accountType: input.accountType,
        displayName: input.displayName,
        displayImage: input.displayImage,
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

/**
 * Syncs an existing account's displayName and displayImage from the brand account.
 */
export async function syncAccountAction(input: SyncAccountInput): Promise<ActionResult> {
  try {
    // Check if account exists
    const existing = await prisma.account.findUnique({
      where: { id: input.id }
    });

    if (!existing) {
      return {
        success: false,
        error: 'Account does not exist. Use create instead.'
      };
    }

    // Update the account
    await prisma.account.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName,
        displayImage: input.displayImage,
        accessedOn: new Date(),
      }
    });

    return { success: true };
  } catch (error) {
    await logProblem(error, 'syncAccountAction');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync account'
    };
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
      prisma.account.findUnique({ where: { id: accountId }, select: { id: true } }),
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
