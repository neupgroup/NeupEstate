'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';

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
