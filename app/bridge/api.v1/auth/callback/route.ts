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
import { logProblem } from '@/services/problem-service';
import { createAccount } from '@/services/account/create';
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
    await createAccount();

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
