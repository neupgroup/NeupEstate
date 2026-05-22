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
import { getAuthenticatedAccount, buildHandshakeGrantUrl, fetchWhoami, fetchAccessInfo } from '@/services/auth';
import { getAuthCookieServer } from '@/services/auth/cookie';
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
          registered: true,
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
            registered: true,
          },
        });
      } catch {
        accountRow = null;
      }
    }

    displayName = accountRow?.displayName ?? null;
    displayImage = accountRow?.displayImage ?? null;
    accountType = accountRow?.accountType ?? null;
    verified = accountRow?.registered ?? verified;
    const neupidFromDb = accountRow?.neupId ?? null;
  } catch {
    // Keep auth response usable even if profile lookup fails.
  }

  // Try to fetch extended user information from bridge
  const token = await getAuthCookieServer();
  
  let bridgeProfile = null;
  let access = null;

  if (token) {
    // Attempt to fetch whoami data (user profile)
    const whoamiResult = await fetchWhoami(token);
    if (whoamiResult.success) {
      bridgeProfile = whoamiResult.data;
    }

    // Attempt to fetch access info (roles/permissions/teams)
    const accessResult = await fetchAccessInfo(token);
    if (accessResult.success) {
      access = accessResult.data;
    }
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
        neupid: neupidFromDb ?? nid ?? null,
      },
      bridgeProfile,
      access,
    },
  });
}
