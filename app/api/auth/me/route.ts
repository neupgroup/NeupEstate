/**
 * GET /api/auth/me
 *
 * Returns the current user's identity decoded from the auth_account JWT cookie.
 * Since the cookie is httpOnly, client components can't read it directly —
 * they call this endpoint instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getActiveAccount } from '@/services/account/getAccount';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const raw = store.get('auth_account')?.value;
  const account = getActiveAccount(raw);

  if (!account?.aid) {
    return NextResponse.json({ accountId: null });
  }

  // Look up the account row for any stored metadata
  try {
    const row = await prisma.account.findUnique({
      where: { id: account.aid },
      select: { id: true, accountType: true, registered: true, displayName: true, displayImage: true },
    });

    return NextResponse.json({
      accountId:    account.aid,
      nid:          account.nid   ?? null,
      guest:        account.guest === 1,
      accountType:  row?.accountType  ?? (account.guest === 1 ? 'guest' : 'individual'),
      registered:   row?.registered   ?? (account.guest !== 1),
      displayName:  row?.displayName  ?? null,
      displayImage: row?.displayImage ?? null,
    });
  } catch {
    // DB unavailable — return what we have from the JWT
    return NextResponse.json({
      accountId:    account.aid,
      nid:          account.nid ?? null,
      guest:        account.guest === 1,
      accountType:  account.guest === 1 ? 'guest' : 'individual',
      registered:   account.guest !== 1,
      displayName:  null,
      displayImage: null,
    });
  }
}
