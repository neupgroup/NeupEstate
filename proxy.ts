import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildPublicAppUrl } from '@/core/helpers/link/url';
import { accountAuthToken } from '@/services/auth/token';

/**
 * proxy.ts — Next.js Edge Middleware
 *
 * auth_account cookie is verified through the shared NeupID token helper.
 *
 * Rules:
 *   1. /bridge/*       → always pass through
 *   2. Static/_next    → always pass through
 *   3. /manage/*       → full auth required:
 *                        - valid JWT, aid present, nid present, no guest flag
 *                        → redirect to the documented handshake grant flow on failure
 *   4. All other paths → pass through and let page-level auth determine whether
 *                        the session is required.
 */

// ---------------------------------------------------------------------------
// JWT payload
// ---------------------------------------------------------------------------

type JwtPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  nid?: string;
  guest?: boolean | number;
};

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

async function verifyJwt(token: string): Promise<{ payload: JwtPayload | null; reason?: string }> {
  const verification = await accountAuthToken(token).validate();
  return verification.valid
    ? { payload: verification.payload }
    : { payload: null, reason: verification.reason };
}

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const NEUPID_BASE = 'https://neupgroup.com/account';

// ---------------------------------------------------------------------------
// Redirect helpers
// ---------------------------------------------------------------------------

function redirectToNeupStart(request: NextRequest, pathname: string): NextResponse {
  const dest = new URL(`${NEUPID_BASE}/account/auth/start`);
  const redirectTarget = buildPublicAppUrl(request, `${pathname}${request.nextUrl.search}`);
  if (redirectTarget) {
    dest.searchParams.set('authenticatesTo', redirectTarget);
  }
  return NextResponse.redirect(dest);
}

// ---------------------------------------------------------------------------
// Proxy (middleware entry point)
// ---------------------------------------------------------------------------

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Attach pathname for downstream server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', pathname);

  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // ── 1. Bridge routes — always pass through ──────────────────────────────
  if (pathname.startsWith('/bridge')) {
    return pass();
  }

  // ── 2. Static assets — always pass through ──────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/.well-known')
  ) {
    return pass();
  }

  // ── 3. HTTPS enforcement ─────────────────────────────────────────────────
  const proto = request.headers.get('x-forwarded-proto');
  const isSecure = proto === 'https' || request.nextUrl.protocol === 'https:';
  if (!isSecure) {
    const dest = new URL('https://neupgroup.com/account/auth/unsecure');
    dest.searchParams.set('redirectsTo', buildPublicAppUrl(request, `${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(dest);
  }

  // ── 4. Device block ──────────────────────────────────────────────────────
  if (request.cookies.has('device_block')) {
    return NextResponse.redirect(new URL('/auth/blocked', request.url));
  }

  // ── Read and verify the auth_account JWT ─────────────────────────────────
  const raw = request.cookies.get('auth_account')?.value;
  const verification = raw ? await verifyJwt(raw.trim()) : { payload: null, reason: 'missing_token' };
  const payload = verification.payload;

  // Forward the verified account ID downstream so server components can use
  // it without re-parsing the JWT (signature already verified here).
  if (payload?.aid) {
    requestHeaders.set('x-account-id', payload.aid);
    if (payload.nid) {
      requestHeaders.set('x-account-nid', payload.nid);
    }
    requestHeaders.set('x-account-guest', payload.guest === 1 || payload.guest === true ? '1' : '0');
  }

  // ── 5. /manage/* — full auth required ────────────────────────────────────
  //    Must have: valid JWT, aid, nid, no guest flag
  if (pathname.startsWith('/manage')) {
    if (!payload || !payload.aid || !payload.nid || payload.guest === 1 || payload.guest === true) {
      return redirectToNeupStart(request, pathname);
    }
    return pass();
  }

  return pass();
}

export const config = {
  matcher: [
    '/((?!_next(?:/.*)?|bridge(?:/.*)?|robots\\.txt$|sitemap\\.xml$|sitemap(?:/.*)?|favicon\\.ico$|humans\\.txt$|\\.well-known(?:/.*)?).*)',
  ],
};
