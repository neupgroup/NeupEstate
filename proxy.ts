import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildPublicAppUrl } from '@neup/core/helpers/link/url';
import { logica } from '@neup/logica';

/**
 * proxy.ts — Next.js Edge Proxy
 *
 * auth_account cookie is verified through the shared NeupID token helper.
 *
 * Rules:
 *   1. /bridge/*       → always pass through
 *   2. Static/_next    → always pass through
 *   3. /manage/*       → full auth required:
 *                        - valid JWT, aid present, nid present, no guest flag
 *                        → redirect to the documented handshake grant flow on failure
 *   4. Account selection is handled from /switch.
 */

// ---------------------------------------------------------------------------
// JWT payload
// ---------------------------------------------------------------------------

type JwtPayload = { aid?: string; sid?: string; skey?: string; nid?: string; guest?: boolean | number };

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

async function verifyJwt(token: string): Promise<{ payload: JwtPayload | null; reason?: string }> {
  const verification = await logica.account.auth.verify(token);
  return verification.valid ? { payload: verification.payload } : { payload: null, reason: verification.reason };
}

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const NEUPID_BASE = 'https://neupgroup.com/account';
const switchPaths = new Set(['/switch']);

// ---------------------------------------------------------------------------
// Redirect helpers
// ---------------------------------------------------------------------------

function redirectToNeupStart(request: NextRequest, pathname: string): NextResponse {
  const dest = new URL(`${NEUPID_BASE}/account/auth/start`);
  const redirectTarget = buildPublicAppUrl(request, `${pathname}${request.nextUrl.search}`);
  if (redirectTarget) dest.searchParams.set('authenticatesTo', redirectTarget);
  return NextResponse.redirect(dest);
}

// ---------------------------------------------------------------------------
// Proxy (request entry point)
// ---------------------------------------------------------------------------

export default async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  // Only propagate a trusted x-auth token after verifying the session cookie.
  requestHeaders.set('x-next-pathname', pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Sitemap routes must remain directly accessible, including when the app
  // is mounted below its configured base path.
  if (pathname.startsWith('/sitemap') || pathname.startsWith('/estate/sitemap')) return pass();

  // Bridge routes always pass through.
  if (pathname.startsWith('/bridge')) return pass();

  // Static assets always pass through.
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/.well-known')) return pass();

  // HTTPS enforcement.
  const proto = request.headers.get('x-forwarded-proto');
  const isSecure = proto === 'https' || request.nextUrl.protocol === 'https:';
  if (!isSecure) {
    const dest = new URL('https://neupgroup.com/account/auth/unsecure');
    dest.searchParams.set('redirectsTo', buildPublicAppUrl(request, `${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(dest);
  }

  // Device block.
  if (request.cookies.has('device_block')) return NextResponse.redirect(new URL('/auth/blocked', request.url));

  // The account switch page must stay reachable.
  if (switchPaths.has(pathname.replace(/\/$/, ''))) return pass();

  // Read and verify the auth_account JWT.
  const raw = request.cookies.get('auth_account')?.value;
  const verification = raw ? await verifyJwt(raw.trim()) : { payload: null, reason: 'missing_token' };
  const payload = verification.payload;
  // Forward the verified account ID downstream so server components can use
  // it without re-parsing the JWT (signature already verified here).
  if (payload?.aid) {
    requestHeaders.set('x-auth', raw!.trim());
    requestHeaders.set('x-account-id', payload.aid);
    if (payload.nid) requestHeaders.set('x-account-nid', payload.nid);
    requestHeaders.set('x-account-guest', payload.guest === 1 || payload.guest === true ? '1' : '0');
  }

  // /manage/* requires a valid non-guest authenticated account.
  if (pathname.startsWith('/manage') && (!payload || !payload.aid || !payload.nid || payload.guest === 1 || payload.guest === true)) {
    return redirectToNeupStart(request, pathname);
  }

  if (pathname.startsWith('/manage') && payload?.aid && !searchParams.has('account')) {
    const selectedAccountUrl = request.nextUrl.clone();
    selectedAccountUrl.searchParams.set('account', payload.aid);
    return NextResponse.redirect(selectedAccountUrl);
  }

  return pass();
}

export const config = {
  matcher: ['/((?!_next(?:/.*)?|bridge(?:/.*)?|robots\\.txt$|sitemap\\.xml$|sitemap(?:/.*)?|favicon\\.ico$|humans\\.txt$|\\.well-known(?:/.*)?).*)'],
};
