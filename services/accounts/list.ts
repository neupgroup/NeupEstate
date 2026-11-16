import { getAccounts } from './id/lookup';
export { getAccounts };
import type { User } from '@/types';
import { prisma } from '@neup/core/database/prisma';

export async function listAccounts(): Promise<User[]> {
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
  } catch (error) {
    return [];
  }
}
