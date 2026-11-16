'use server';

import type { User } from '@/types';
import { prisma } from '@neup/core/database/prisma';

/** Loads selectable account options through a server action for client pages. */
export async function getAccountInfo(): Promise<User[]> {
  try {
    const accounts = await prisma.account.findMany({
      where: { accountType: { not: 'guest' } },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      select: { id: true, displayName: true, neupId: true, displayImage: true, accountType: true },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.displayName?.trim() || account.neupId || account.id,
      role: account.accountType === 'individual.agent' ? 'Agent' : 'User',
      avatarUrl: account.displayImage || undefined,
    }));
  } catch {
    return [];
  }
}
