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

  // Try to fetch extended user information from bridge
  const token = await getAuthCookieServer();
  
  let profile = null;
  let access = null;

  if (token) {
    // Attempt to fetch whoami data (user profile)
    const whoamiResult = await fetchWhoami(token);
    if (whoamiResult.success) {
      profile = whoamiResult.data;
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
      profile,
      access,
    },
  });
}
