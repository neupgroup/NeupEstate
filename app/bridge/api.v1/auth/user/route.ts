/**
 * ::neup.documentation::bridge-auth-user-route
 * ::api GET /bridge/api.v1/auth/user
 *
 * Returns a fuller authenticated user payload than `/bridge/api.v1/auth/me`.
 *
 * ::public
 *
 * This route combines authenticated bridge identity with profile and access data.
 *
 * Returned user fields include:
 * - `aid`, `nid`, `sid`, `skey`
 * - guest and verification state
 * - `displayName`, `displayImage`, `accountType`
 * - `profile` summary
 * - `bridgeProfile` connection data
 * - `access` role data
 *
 * Response behavior:
 * - `200` with `{ success: true, user }` when authentication succeeds
 * - `401` with `{ success: false, redirectTo }` when authentication fails
 *
 * ::public end
 *
 * ::private
 *
 * Resolution merges three sources:
 * 1. authenticated cookie data from `getAuthenticatedAccount()`
 * 2. local account state from Prisma
 * 3. upstream signed account data from `getSignedAccountInformation()`
 *
 * Local database values are preferred when present. Upstream signed account data
 * is used to fill gaps such as display name, neup id, bridge connection details,
 * and role context.
 *
 * The route intentionally preserves a usable auth response even when database
 * profile reads fail.
 *
 * ::private end
 * ::end
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount, buildHandshakeGrantUrl } from '@/services/auth';
import { getSignedAccountInformation } from '@/services/account/lookup';
import { prisma } from '@/logica/core/prisma';
import { withRequestDevLog } from '@/services/site-dev-log-service';

const getHandler = async (request: NextRequest) => {
  // Verify authentication
  const authResult = await getAuthenticatedAccount();

  if (!authResult.success) {
    return NextResponse.json({
      success: false,
      redirectTo: buildHandshakeGrantUrl(request),
    }, { status: 401 });
  }

  const { aid, nid, guest, sid, skey } = authResult.account;

  let displayName: string | null = null;
  let displayImage: string | null = null;
  let accountType: string | null = null;
  let neupidFromDb: string | null = null;
  let verified = guest !== 1;

  try {
    let accountRow: any = null;
    try {
      accountRow = await prisma.account.findUnique({
        where: { id: aid },
        select: {
          neupId: true,
          displayName: true,
          displayImage: true,
          accountType: true,
        },
      });
    } catch (err: any) {
      // Fall back if DB schema hasn't been migrated yet (no neupId column)
      try {
        accountRow = await prisma.account.findUnique({
          where: { id: aid },
          select: {
            displayName: true,
            displayImage: true,
            accountType: true,
          },
        });
      } catch {
        accountRow = null;
      }
    }

    displayName = accountRow?.displayName ?? null;
    displayImage = accountRow?.displayImage ?? null;
    accountType = accountRow?.accountType ?? null;
    verified = (accountRow?.accountType ?? (guest === 1 ? 'guest' : 'individual')) !== 'guest';
    neupidFromDb = accountRow?.neupId ?? null;
  } catch {
    // Keep auth response usable even if profile lookup fails.
  }

  const signed = await getSignedAccountInformation();
  const signedAccount = signed.found ? signed.account : null;

  const bridgeProfile = signedAccount
    ? {
        accountId: signedAccount.accountId,
        connectionId: signedAccount.connectionId,
        role: signedAccount.role,
        token: signedAccount.token,
        isMinor: signedAccount.isMinor,
      }
    : null;

  const access = signedAccount ? { role: signedAccount.role } : null;

  if (signedAccount) {
    displayName = displayName ?? signedAccount.displayName;
    neupidFromDb = neupidFromDb ?? signedAccount.neupId;
  }

  return NextResponse.json({
    success: true,
    user: {
      aid,
      nid,
      guest: guest === 1,
      sid,
      skey,
      displayName,
      displayImage,
      accountType,
      verified,
      profile: {
        displayName,
        displayImage,
        neupid: neupidFromDb ?? signedAccount?.neupId ?? nid ?? null,
      },
      bridgeProfile,
      access,
    },
  });
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/user' }, getHandler);
