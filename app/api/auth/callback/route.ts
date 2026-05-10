/**
 * POST /api/auth/callback
 *
 * Server-side handler for the NeupID Silent SSO code exchange.
 * Receives the authorization code from the client, exchanges it with NeupID
 * for the full identity, upserts the account row, and sets the auth cookie.
 *
 * This endpoint is server-to-server with NeupID — the browser never calls
 * the NeupID /exchange endpoint directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logProblem } from '@/services/problem-service';

const NEUPID_EXCHANGE_URL =
  'https://neupgroup.com/account/bridge/silent.v1/auth/exchange';

const APP_ID = process.env.NEUPID_APP_ID!;
const APP_SECRET = process.env.NEUPID_APP_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, codeVerifier } = body as { code?: string; codeVerifier?: string };

    if (!code) {
      return NextResponse.json({ error: 'missing_code' }, { status: 400 });
    }

    if (!APP_ID || !APP_SECRET) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    // Exchange the code with NeupID (server-to-server)
    const exchangeBody: Record<string, string> = {
      appId: APP_ID,
      appSecret: APP_SECRET,
      code,
    };
    if (codeVerifier) exchangeBody.codeVerifier = codeVerifier;

    const exchangeRes = await fetch(NEUPID_EXCHANGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exchangeBody),
    });

    const identity = await exchangeRes.json();

    if (!exchangeRes.ok || !identity.success) {
      return NextResponse.json(
        { error: identity.error ?? 'exchange_failed' },
        { status: 401 }
      );
    }

    const { accountId, neupId, displayName, displayImage, accountType, verified } = identity as {
      accountId: string;
      neupId: string;
      displayName: string;
      displayImage: string;
      accountType: string;
      verified: boolean;
    };

    // Upsert the account row — id is the ssid (accountId from NeupID)
    await prisma.account.upsert({
      where: { id: accountId },
      create: {
        id: accountId,
        accountType: accountType ?? 'individual',
        registered: true,
        createdOn: new Date(),
        accessedOn: new Date(),
      },
      update: {
        accessedOn: new Date(),
        accountType: accountType ?? 'individual',
        registered: true,
      },
    });

    // Build the auth_accounts cookie entry
    // Format: [{ aid, def }] — minimal, no session triplet needed anymore
    const authEntry = JSON.stringify([{ aid: accountId, def: true }]);

    const response = NextResponse.json({
      success: true,
      accountId,
      neupId,
      displayName,
      displayImage,
      accountType,
      verified,
    });

    // Set the auth_accounts cookie (httpOnly, secure in production)
    response.cookies.set('auth_accounts', authEntry, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 28, // 28 days — matches NeupID expires_on
    });

    return response;
  } catch (e) {
    await logProblem(e, 'POST /api/auth/callback');
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
