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

function logMeLookupStatus(
  stage: string,
  details: Record<string, unknown>,
) {
  console.log('[auth.me.lookup]', {
    stage,
    ...details,
  });
}

export async function getAuthenticatedMeData(): Promise<AuthenticatedMe | null> {
  const result = await getAuthenticatedAccount();
  if (!result.success) {
    logMeLookupStatus('auth_failed', { reason: result.reason });
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
    logMeLookupStatus('lookup_response', {
      accountId: account.aid,
      ok: profile.ok,
      status: profile.status,
      success: profile.body.success,
      error: profile.body.error,
      reason: profile.body.reason,
      responseAccountId: profile.body.accountId,
      neupid: profile.body.neupid,
      displayName: profile.body.displayName,
      hasDisplayImage: Boolean(profile.body.displayImage),
      accountType: profile.body.accountType,
    });

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
    logMeLookupStatus('normalized_me', {
      accountId: me.accountId,
      neupId: me.neupId,
      displayName: me.displayName,
      hasDisplayImage: Boolean(me.displayImage),
      accountType: me.accountType,
      guest: me.guest,
    });

    return me;
  } catch (error) {
    logMeLookupStatus('lookup_error', {
      accountId: account.aid,
      message: error instanceof Error ? error.message : 'unknown_error',
    });
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
    logMeLookupStatus('normalized_me_fallback', {
      accountId: me.accountId,
      neupId: me.neupId,
      displayName: me.displayName,
      hasDisplayImage: Boolean(me.displayImage),
      accountType: me.accountType,
      guest: me.guest,
    });
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
