/**
 * GET /api/auth/me
 *
 * Returns the current user's identity from the auth_accounts cookie.
 * Since the cookie is httpOnly, client components can't read it directly —
 * they call this endpoint instead.
 *
 * Returns the cached identity from the account row if authenticated,
 * or { accountId: null } if not.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getActiveAccount } from '@/services/account/getAccount';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const authRaw = store.get('auth_accounts')?.value;
  const active = getActiveAccount(authRaw);

  if (!active?.aid) {
    return NextResponse.json({ accountId: null });
  }

  // Look up the account row for any stored metadata
  try {
    const account = await prisma.account.findUnique({
      where: { id: active.aid },
      select: { id: true, accountType: true, registered: true },
    });

    return NextResponse.json({
      accountId: active.aid,
      accountType: account?.accountType ?? 'individual',
      registered: account?.registered ?? true,
    });
  } catch {
    // DB unavailable — still return the accountId from the cookie
    return NextResponse.json({ accountId: active.aid });
  }
}
