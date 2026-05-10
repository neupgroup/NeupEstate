import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * proxy.ts — Next.js Edge Middleware
 *
 * auth_account cookie is a JWT signed with AUTH_PUBLIC_KEY (RS256).
 *
 * Payload shape:
 *   { aid, sid, skey, nid, guest? }
 *   - aid   : account ID (present for all accounts, including guests)
 *   - sid   : session ID
 *   - skey  : session key
 *   - nid   : NeupID (only set for fully registered accounts)
 *   - guest : 1 if guest, unset if registered
 *
 * Rules:
 *   1. /bridge/*       → always pass through
 *   2. Static/_next    → always pass through
 *   3. /manage/*       → full auth required:
 *                        - valid JWT, aid present, nid present, no guest flag
 *                        → redirect to neupgroup.com/account/auth/start on failure
 *   4. All other paths → identification required:
 *                        - if auth_account cookie is missing or invalid,
 *                          redirect to whoisthisthat bridge (sets cookie
 *                          automatically, same domain) then bounces back
 *                        - guests (aid present, guest: 1) are allowed through
 *                        - registered users are allowed through
 */

// ---------------------------------------------------------------------------
// JWT payload
// ---------------------------------------------------------------------------

type JwtPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  nid?: string;
  guest?: number;
};

// ---------------------------------------------------------------------------
// Web Crypto key import — Edge runtime compatible
// ---------------------------------------------------------------------------

let _cachedKey: CryptoKey | null | undefined = undefined;

async function getPublicKey(): Promise<CryptoKey | null> {
  if (_cachedKey !== undefined) return _cachedKey;

  const pem = process.env.AUTH_PUBLIC_KEY;
  if (!pem) {
    _cachedKey = null;
    return null;
  }

  try {
    const pemBody = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\\n/g, '')
      .replace(/\s/g, '');

    const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    _cachedKey = await crypto.subtle.importKey(
      'spki',
      keyBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    return _cachedKey;
  } catch {
    _cachedKey = null;
    return null;
  }
}

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

function b64urlDecode(str: string): string {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  return atob(pad ? s + '='.repeat(4 - pad) : s);
}

async function verifyJwt(token: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;

  // Dev fallback: unsigned token
  if (header === 'unsigned' && sig === 'nosig') {
    try { return JSON.parse(b64urlDecode(body)); } catch { return null; }
  }

  const publicKey = await getPublicKey();

  // No public key → cannot verify → treat as unauthenticated
  if (!publicKey) return null;

  try {
    const signingInput = `${header}.${body}`;
    const sigPadded = sig.replace(/-/g, '+').replace(/_/g, '/');
    const pad = sigPadded.length % 4;
    const sigBuffer = Uint8Array.from(
      atob(pad ? sigPadded + '='.repeat(4 - pad) : sigPadded),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sigBuffer,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return null;
    return JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const BASE_PATH          = '/estate';
const AUTH_START_URL     = 'https://neupgroup.com/account/auth/start';
const WHOISTHISTHAT_URL  = 'https://neupgroup.com/account/bridge/silent.v1/whoisthisthat';

// ---------------------------------------------------------------------------
// Redirect helpers
// ---------------------------------------------------------------------------

function redirectToAuthStart(request: NextRequest, pathname: string): NextResponse {
  const dest = new URL(AUTH_START_URL);
  if (pathname && pathname !== '/') {
    dest.searchParams.set('redirects', BASE_PATH + pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(dest);
}

function redirectToWhoisthisthat(request: NextRequest, pathname: string): NextResponse {
  const dest = new URL(WHOISTHISTHAT_URL);
  dest.searchParams.set('redirectsTo', BASE_PATH + pathname + request.nextUrl.search);
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
    dest.searchParams.set('redirectsTo', BASE_PATH + pathname + request.nextUrl.search);
    return NextResponse.redirect(dest);
  }

  // ── 4. Device block ──────────────────────────────────────────────────────
  if (request.cookies.has('device_block')) {
    return NextResponse.redirect(new URL('/auth/blocked', request.url));
  }

  // ── Read and verify the auth_account JWT ─────────────────────────────────
  const raw = request.cookies.get('auth_account')?.value;
  const payload = raw ? await verifyJwt(raw.trim()) : null;

  // ── 5. /manage/* — full auth required ────────────────────────────────────
  //    Must have: valid JWT, aid, nid, no guest flag
  if (pathname.startsWith('/manage')) {
    if (!payload || !payload.aid || !payload.nid || payload.guest === 1) {
      return redirectToAuthStart(request, pathname);
    }
    return pass();
  }

  // ── 6. All other paths — identification required ─────────────────────────
  //    Guests are allowed. Missing/invalid cookie → whoisthisthat bridge.
  if (!payload || !payload.aid) {
    return redirectToWhoisthisthat(request, pathname);
  }

  return pass();
}

export const config = {
  matcher: [
    '/((?!_next(?:/.*)?|bridge(?:/.*)?|robots\\.txt$|sitemap\\.xml$|sitemap(?:/.*)?|favicon\\.ico$|humans\\.txt$|\\.well-known(?:/.*)?).*)',
  ],
};
