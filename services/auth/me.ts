import { NextRequest, NextResponse } from 'next/server';
import { getNeupBridgeEnvironment } from '@/logica/neupid/api';
import { getAccountInfo as getLogicaAccountInfo } from '@/logica/neupid/accounts/getInfo';
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
    const environment = getNeupBridgeEnvironment();
    const profile = await getLogicaAccountInfo({
      appId: environment.appId,
      appSecret: environment.appSecret,
      accountId: account.aid,
    });
    const profileBody = profile.ok && profile.body.success ? profile.body : null;

    return {
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest,
      accountType,
      registered: !guest,
      displayName: profileBody?.displayName ?? null,
      displayImage: profileBody?.displayImage ?? null,
      workingProfile: null,
      workingProfileDisplayName: null,
    };
  } catch {
    return {
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
