/**
 * GET /api/auth/me
 *
 * Returns the current user's identity from the auth_account JWT cookie.
 *
 * Flow:
 *  1. Verify JWT signature and decode account using centralized auth service
 *  2. If invalid/missing, returns 401 with redirectTo for NeupID login
 *  3. Enriches with displayName / displayImage from the local account table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount } from '@/services/auth';
import { buildHandshakeGrantUrl } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // ── Step 1: verify JWT and get account ───────────────────────────────────
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    const redirectTo = buildHandshakeGrantUrl(req, req.nextUrl.href);

    return NextResponse.json(
      { accountId: null, reason: result.reason, redirectTo },
      { status: 401 },
    );
  }

  const account = result.account;

  // ── Step 2: enrich with DB display fields ────────────────────────────────
  try {
    const row = await prisma.account.findUnique({
      where: { id: account.aid },
      select: { id: true, accountType: true, registered: true, displayName: true, displayImage: true },
    });

    return NextResponse.json({
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest: account.guest === 1,
      accountType: row?.accountType ?? (account.guest === 1 ? 'guest' : 'individual'),
      registered: row?.registered ?? (account.guest !== 1),
      displayName: row?.displayName ?? null,
      displayImage: row?.displayImage ?? null,
    });
  } catch {
    // DB unavailable — return what we have from the verified JWT
    return NextResponse.json({
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest: account.guest === 1,
      accountType: account.guest === 1 ? 'guest' : 'individual',
      registered: account.guest !== 1,
      displayName: null,
      displayImage: null,
    });
  }
}
