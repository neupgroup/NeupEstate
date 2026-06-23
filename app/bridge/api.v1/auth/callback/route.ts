/**
 * /api/auth/callback
 *
 * This endpoint is called after the user completes authentication with Neup.Account.
 * The Neup.Account bridge has already set the auth_account cookie on the client.
 * 
 * This route simply:
 * 1. Receives the callback
 * 2. Reads the aid from the cookie (if present)
 * 3. Upserts the account in the database
 * 4. Redirects to the requested destination
 *
 * Cookie management is handled entirely by Neup.Account, not by this app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { getAuthenticatedAccount } from '@/services/auth';
import { withRequestDevLog } from '@/services/site-dev-log-service';

function getRedirectTarget(request: NextRequest): string {
  const redirectsTo = request.nextUrl.searchParams.get('redirectsTo');
  if (redirectsTo) {
    return redirectsTo;
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (returnTo) {
    return returnTo;
  }

  return '/';
}

async function handleCallback(request: NextRequest) {
  try {
    // Get the authenticated account from the cookie
    // (Neup.Account bridge has already set it)
    const authResult = await getAuthenticatedAccount();

    // If authentication is successful and we have an aid, upsert the account
    if (authResult.success && authResult.account.aid) {
      const { aid, nid, guest } = authResult.account;

      await prisma.account.upsert({
        where: { id: aid },
        create: {
          id: aid,
          accountType: guest === 1 ? 'guest' : 'individual',
          displayName: nid ?? aid,
          createdOn: new Date(),
          accessedOn: new Date(),
        },
        update: {
          accessedOn: new Date(),
          displayName: nid ?? aid,
        },
      });
    }

    // Always redirect to the requested destination
    const redirectTarget = getRedirectTarget(request);
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  } catch (error) {
    await logProblem(error, 'GET /api/auth/callback');
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

const getHandler = async (req: NextRequest) => {
  return await handleCallback(req);
};

const postHandler = async (req: NextRequest) => {
  return await handleCallback(req);
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/callback:GET' }, getHandler);
export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/callback:POST' }, postHandler);
