import { NextRequest, NextResponse } from 'next/server';
import { lookup } from '@/logica/neupid/lookup';
import { buildHandshakeGrantUrl, getAuthenticatedAccount } from '@/services/auth';

export type AuthenticatedMe = {
  accountId: string;
  neupId: string | null;
  guest: boolean;
  accountType: string;
  registered: boolean;
  displayName: string | null;
  displayImage: string | null;
  workingProfile: string | null;
  workingProfileDisplayName: string | null;
};

function isGuestClaim(value: unknown): boolean {
  return value === 1 || value === true;
}

export async function getAuthenticatedMeData(): Promise<AuthenticatedMe | null> {
  const result = await getAuthenticatedAccount();
  if (!result.success) {
    return null;
  }

  const account = result.account;
  const guest = isGuestClaim(account.guest);
  const accountType = guest ? 'guest' : 'individual';

  try {
    const profile = await lookup({
      accountId: account.aid,
      fields: ['displayName', 'displayImage', 'accountType', 'neupid'],
    });
    const profileBody = profile.ok && profile.body.success ? profile.body : null;

    const me = {
      accountId: account.aid,
      neupId: profileBody?.neupid ?? account.nid ?? null,
      guest,
      accountType: profileBody?.accountType ?? accountType,
      registered: !guest,
      displayName: profileBody?.displayName ?? null,
      displayImage: profileBody?.displayImage ?? null,
      workingProfile: null,
      workingProfileDisplayName: null,
    };

    return me;
  } catch {
    const me = {
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest,
      accountType,
      registered: !guest,
      displayName: null,
      displayImage: null,
      workingProfile: null,
      workingProfileDisplayName: null,
    };
    return me;
  }
}

export async function getAuthenticatedMeResponse(req: NextRequest) {
  const result = await getAuthenticatedAccount();
  if (!result.success) {
    const redirectTo = buildHandshakeGrantUrl(req, req.nextUrl.href);
    return NextResponse.json(
      { accountId: null, reason: result.reason, redirectTo },
      { status: 401 },
    );
  }
  const me = await getAuthenticatedMeData();
  return NextResponse.json(me);
}
