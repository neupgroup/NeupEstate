import { getAuthenticatedAccount } from '@/services/auth';
import { prisma } from '@/lib/prisma';
import { ProfileHeader } from './profile-header';

type ProfileHeaderData = {
  accountId: string;
  neupId?: string | null;
  displayName?: string | null;
  displayImage?: string | null;
  accountType?: string;
  verified?: boolean;
};

async function getProfileData(): Promise<ProfileHeaderData | null> {
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    return null;
  }

  const account = result.account;

  try {
    const row = await prisma.account.findUnique({
      where: { id: account.aid },
      select: {
        id: true,
        accountType: true,
        registered: true,
        displayName: true,
        displayImage: true,
      },
    });

    return {
      accountId: account.aid,
      neupId: account.nid ?? null,
      displayName: row?.displayName ?? null,
      displayImage: row?.displayImage ?? null,
      accountType: row?.accountType ?? (account.guest === 1 ? 'guest' : 'individual'),
      verified: row?.registered ?? account.guest !== 1,
    };
  } catch {
    return {
      accountId: account.aid,
      neupId: account.nid ?? null,
      displayName: null,
      displayImage: null,
      accountType: account.guest === 1 ? 'guest' : 'individual',
      verified: account.guest !== 1,
    };
  }
}

export async function ServerProfileHeader() {
  const data = await getProfileData();

  if (!data) {
    return null;
  }

  return <ProfileHeader {...data} />;
}
