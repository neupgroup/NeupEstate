/**
 * ::neup.documentation::bridge-auth-callback-route
 * ::api GET|POST /bridge/api.v1/auth/callback
 *
 * Handles the post-authentication callback from Neup.Account.
 *
 * ::public
 *
 * This route is invoked after the upstream auth bridge completes authentication
 * and sets the `auth_account` cookie on the client.
 *
 * Behavior:
 * - reads the authenticated account from the bridge cookie
 * - creates or updates a local account row when an authenticated account is present
 * - redirects the user to `redirectsTo`, `returnTo`, or `/`
 *
 * Supported methods:
 * - `GET`
 * - `POST`
 *
 * Response behavior:
 * - redirect to the requested destination on success
 * - `500` JSON error on unexpected failure
 *
 * ::public end
 *
 * ::private
 *
 * This route does not manage the auth cookie itself. Cookie issuance is owned by
 * the upstream Neup.Account bridge.
 *
 * Local account persistence is intentionally lightweight:
 * - `id` is seeded from `aid`
 * - `displayName` falls back to `nid` or `aid`
 * - `accessedOn` is refreshed on every callback
 *
 * Both `GET` and `POST` flow through the same callback handler to keep redirect
 * and account-upsert behavior consistent.
 *
 * ::private end
 * ::end
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';
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
