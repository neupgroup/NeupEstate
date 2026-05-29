/**
 * app/api/auth/user/route.ts
 *
 * Returns comprehensive user information including:
 * - Verified account data from the auth cookie
 * - User profile (name, email, roles, teams, permissions)
 * - Access context from the bridge API
 *
 * Used by pages and client components to fetch authenticated user data.
 *
 * GET /api/auth/user
 * Returns: { success: true; user: { aid, nid, guest, ...profileData } }
 *          { success: false; redirectTo: string } (on auth failure)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount, buildHandshakeGrantUrl } from '@/services/auth';
import { getSignedAccountInformation } from '@/services/account/lookup';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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
  const bridgeProfile = signed.found
    ? {
        accountId: signed.account.accountId,
        connectionId: signed.account.connectionId,
        role: signed.account.role,
        token: signed.account.token,
        isMinor: signed.account.isMinor,
      }
    : null;
  const access = signed.found ? { role: signed.account.role } : null;

  if (signed.found) {
    displayName = displayName ?? signed.account.displayName;
    neupidFromDb = neupidFromDb ?? signed.account.neupId;
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
        neupid: neupidFromDb ?? signed.account.neupId ?? nid ?? null,
      },
      bridgeProfile,
      access,
    },
  });
}
