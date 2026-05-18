/**
 * AUTH API IMPLEMENTATION REFERENCE
 *
 * This document outlines the Neup.Account authentication system integration
 * and how to use it across the application.
 */

// ─── Server-Side Authentication (Verified) ───────────────────────────────────

/**
 * REQUIRE AUTHENTICATION
 * Use in any page or route handler that needs an authenticated user.
 * Automatically redirects to login if not authenticated.
 */

// Protected page example:
// app/manage/agencies/page.tsx

import { requireAuth, requireRegisteredAuth } from '@/services/auth';

export default async function ManageAgenciesPage() {
  // Require any authenticated user (including guests)
  const account = await requireAuth();
  // account: { aid, sid, skey, nid, guest, ... }

  // OR require a registered (non-guest) user
  const registeredAccount = await requireRegisteredAuth();
  // registeredAccount: { aid, sid, skey, nid (required), guest: 0 }
}

// ─── Getting User Information ─────────────────────────────────────────────────

/**
 * FETCH USER PROFILE & ACCESS INFO
 * Use the /api/auth/user endpoint to get comprehensive user data.
 */

// GET /api/auth/user
// Returns:
// {
//   success: true,
//   user: {
//     aid: "account-id",
//     nid: "neupid-handle" (optional),
//     guest: false,
//     sid: "session-id",
//     skey: "session-key",
//     profile: { ... },        // User profile from bridge
//     access: { ... },         // Roles/permissions/teams from bridge
//   }
// }

// ─── Bridge API Endpoints (Read-Only) ──────────────────────────────────────

/**
 * For advanced integration, use bridge functions directly:
 * (Note: All cookie modifications are handled by Neup.Account, not this app)
 */

import {
  buildHandshakeGrantUrl,      // Redirect to login
  buildWhoamiUrl,              // GET /bridge/api.v1/auth/whoami
  buildAccessUrl,              // GET /bridge/api.v1/auth/access
  fetchWhoami,                 // Fetch current user info
  fetchAccessInfo,             // Fetch roles/permissions
} from '@/services/auth';

// ─── Neup.Account Bridge API Reference ─────────────────────────────────────

/**
 * REDIRECT HANDSHAKE (Interactive Sign-In)
 * GET /bridge/handshake.v1/auth/grant
 *
 * When: External sign-in / sign-up where user may need to login or consent
 * Parameters:
 *   - app: YOUR_APP_ID (required)
 *   - authenticatesTo: https://yourapp.com/auth/callback (required)
 * Success: Redirects callback with tempToken in query params
 *
 * Usage:
 */
buildHandshakeGrantUrl(request, redirectsTo);
// Returns: https://neupgroup.com/account/bridge/handshake.v1/auth/grant?app=...

/**
 * SILENT SSO (Iframe + postMessage)
 * GET /bridge/silent.v1/whoisthis
 *
 * When: Silent "already logged in?" checks without redirect
 * Parameters:
 *   - app: YOUR_APP_ID (required)
 * Success: Returns HTML that posts to parent frame via postMessage
 *
 * Note: Browser origin must be registered as silentSsoOrigin for the app
 */

/**
 * EXCHANGE TEMP TOKEN (Get Session)
 * POST /bridge/api.v1/auth/grant
 *
 * DEPRECATED: This app no longer handles token exchange.
 * Neup.Account bridge manages all cookie operations.
 *
 * The callback route now simply:
 * 1. Receives the callback from Neup.Account
 * 2. Reads the auth_account cookie (already set by bridge)
 * 3. Upserts the account record
 * 4. Redirects to requested destination
 */

/**
 * REFRESH SESSION
 * PATCH /bridge/api.v1/auth/grant
 *
 * When: Refresh an external session and get new JWT
 * Request body (token-based, preferred):
 *   { "token": "TOKEN_FROM_COOKIES" }
 * Request body (legacy, triplet-based):
 *   { "app": "YOUR_APP_ID", "aid": "...", "sid": "...", "skey": "..." }
 */

/**
 * CHECK SESSION VALIDITY
 * GET /bridge/api.v1/auth/grant
 *
 * When: Check if previously issued (aid, sid, skey) session is still valid
 * Parameters:
 *   - app: YOUR_APP_ID
 *   - aid: account-id
 *   - sid: session-id
 *   - skey: session-key
 */

/**
 * VALIDATE TOKEN (Server-to-Server)
 * POST /bridge/api.v1/auth/validate
 *
 * DEPRECATED: This app only reads and verifies tokens locally.
 * For server validation, use getAuthenticatedAccount() instead.
 */

/**
 * EXPIRE / LOGOUT
 * POST /bridge/api.v1/auth/expire
 *
 * DEPRECATED: This app does not handle logout.
 * Neup.Account bridge manages cookie expiry.
 *
 * Client should redirect to Neup.Account logout endpoint directly
 * if logout functionality is needed.
 */

/**
 * GET CURRENT USER (Cross-Origin with Cookies)
 * GET /bridge/api.v1/auth/whoami
 *
 * When: Browser app wants to read logged-in user using cookies
 * Requirement: Browser origin must be registered as authenticatesTo origin
 *
 * Usage:
 */
fetchWhoami(token);
// Returns: { success: true, data: { ...userProfile } }

/**
 * GET ACCESS CONTEXT (Roles / Permissions / Teams)
 * GET /bridge/api.v1/auth/access
 *
 * When: Fetch user's roles, permissions, team memberships
 *
 * Usage:
 */
fetchAccessInfo(token);
// Returns: { success: true, data: { roles: [...], teams: [...], ... } }

// ─── Implementation Checklist ──────────────────────────────────────────────

/**
 * ✅ COMPLETED
 *
 * [✓] App only reads cookies, never modifies them
 * [✓] Neup.Account bridge handles all cookie operations
 * [✓] Redirect handshake flow (GET /bridge/handshake.v1/auth/grant)
 * [✓] Callback endpoint receives auth_account cookie (set by bridge)
 * [✓] Account upsert on callback (if aid exists in cookie)
 * [✓] Whoami endpoint defined (GET /bridge/api.v1/auth/whoami)
 * [✓] Access endpoint defined (GET /bridge/api.v1/auth/access)
 * [✓] /api/auth/user endpoint for comprehensive user data
 * [✓] Authentication guards on /manage/* pages
 * [✓] requireAuth() guard for protected pages
 * [✓] requireRegisteredAuth() guard for registered users only
 * [✓] Activity logging only saves if aid exists
 *
 * ❌ REMOVED (Cookie management now by Neup.Account)
 * [x] tempToken exchange (exchangeTempToken) - REMOVED
 * [x] Token expiry/logout (expireAuthToken) - REMOVED
 * [x] Cookie-setting logic (/api/auth/logout route) - REMOVED
 * [x] Server-side token validation (validateAuthToken) - REMOVED
 *
 * Pages updated:
 * [✓] /manage/page.tsx (dashboard)
 * [✓] /manage/accounts/page.tsx (account details)
 * [✓] /manage/agency/page.tsx (agency management)
 *
 * ⏭️  TODO (Optional Enhancements)
 *
 * [ ] Apply requireAuth guards to remaining /manage/* pages
 * [ ] Create client-side hook for /api/auth/user endpoint
 * [ ] Add user profile cache/context
 * [ ] Create role-based access control (RBAC) helpers
 */
 */

// ─── Usage Examples ───────────────────────────────────────────────────────

/**
 * EXAMPLE 1: Protect a Page
 */

// app/manage/some-page/page.tsx
import { requireAuth } from '@/services/auth';

export default async function SomePage() {
  const account = await requireAuth(); // Redirects if not logged in
  
  return (
    <div>
      <h1>Welcome, {account.nid || account.aid}</h1>
    </div>
  );
}

/**
 * EXAMPLE 2: Use /api/auth/user Endpoint
 */

// In a Server Component:
async function UserProfile() {
  const response = await fetch('http://localhost:3000/api/auth/user', {
    headers: { 'Cookie': getCookieHeader() }, // Server-to-server
  });

  if (!response.ok) {
    return <p>Please log in</p>;
  }

  const data = await response.json();
  return (
    <div>
      <p>Account ID: {data.user.aid}</p>
      <p>Guest: {data.user.guest ? 'Yes' : 'No'}</p>
      {data.user.profile && (
        <p>Profile: {JSON.stringify(data.user.profile)}</p>
      )}
    </div>
  );
}

/**
 * EXAMPLE 3: Custom Auth Guard
 */

import { getAuthenticatedAccount } from '@/services/auth';
import { redirect } from 'next/navigation';

async function customAuthGuard() {
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    // Manual handling instead of auto-redirect
    return { authenticated: false, reason: result.reason };
  }

  return { authenticated: true, account: result.account };
}

/**
 * EXAMPLE 4: Get User Info in a Server Action
 */

// app/manage/agency/actions.ts
'use server';

import { requireRegisteredAuth, fetchWhoami } from '@/services/auth';
import { getAuthCookieServer } from '@/services/auth';

export async function getSyncAgencies() {
  // Ensure user is registered (not guest)
  const account = await requireRegisteredAuth();

  // Get additional user info
  const token = await getAuthCookieServer();
  const userInfo = await fetchWhoami(token);

  // ... rest of action
}

/**
 * EXAMPLE 5: Check Session Status (Server Component)
 */

import { isAuthenticated, isGuest, getAccountId } from '@/services/auth';

export default async function Dashboard() {
  const authed = await isAuthenticated();
  const guest = await isGuest();
  const aid = await getAccountId();

  if (!authed) {
    return <p>Not authenticated</p>;
  }

  return (
    <div>
      <p>Account ID: {aid}</p>
      <p>Guest User: {guest ? 'Yes' : 'No'}</p>
    </div>
  );
}

// ─── Environment Variables ───────────────────────────────────────────────────

/**
 * Required:
 * - AUTH_PUBLIC_KEY: RSA public key for JWT verification (PEM, SPKI format)
 * - NEUPID_APP_ID: Server-side NeupID application ID
 *
 * Optional:
 * - NEXT_PUBLIC_NEUPID_APP_ID: Client-side app ID (defaults to NEUPID_APP_ID)
 * - NEXT_PUBLIC_BASE_URL: Base URL for callback construction
 *   (defaults to 'https://neupgroup.com/estate')
 */

// ─── Common Issues & Solutions ─────────────────────────────────────────────

/**
 * Issue: "You're importing a module that depends on 'next/headers'"
 * Solution: Move import inside async function with dynamic import:
 *   const { headers } = await import('next/headers');
 *
 * Issue: "Redirect expects absolute URL"
 * Solution: Use buildHandshakeGrantUrl which handles absolute URLs
 *
 * Issue: httpOnly cookie not being set
 * Solution: Ensure response is from a Route Handler (not Server Component)
 *   and cookie is set with { httpOnly: true, secure: true, sameSite: 'lax' }
 *
 * Issue: tempToken exchange returns 400
 * Solution: Check that NEUPID_APP_ID is correct in environment
 */
