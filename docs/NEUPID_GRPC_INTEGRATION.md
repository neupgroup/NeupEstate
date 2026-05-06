# NeupID gRPC Integration

This document explains how user identity verification is implemented in this Next.js application using the NeupID gRPC AuthService.

---

## Overview

The application uses a **gRPC-based session verification** system to authenticate users. When a user logs in via the external NeupID service (neupgroup.com/account), their browser receives an `auth_accounts` cookie containing session credentials. This application verifies those credentials by calling the NeupID gRPC server.

### Architecture

```
Browser
  │
  │  auth_accounts cookie (JSON array with aid, sid, skey)
  ▼
Next.js Server (this app)
  │
  │  1. Parse cookie → extract active account
  │  2. Call gRPC Verify(sessionId, sessionKey, accountId)
  ▼
NeupID gRPC Server (port 50051)
  │
  │  Validates session, returns user identity
  ▼
Next.js Server
  │
  │  Uses accountId / neupId / displayName / etc.
  ▼
Business Logic
```

---

## Files

### 1. `src/proto/auth.proto`

The Protocol Buffers definition for the AuthService. Defines the `Verify` RPC and the `User` message.

**Key messages:**
- `VerifyRequest`: Contains `sessionId`, `sessionKey`, `accountId`
- `VerifyResponse`: Contains `valid` (bool), `error` (string), `user` (User)
- `User`: Contains `accountId`, `neupId`, `displayName`, `displayImage`, `accountType`, `verified`

### 2. `lib/neupid-grpc.ts`

Creates and exports a singleton gRPC client for the AuthService. The client is cached globally to avoid creating a new channel on every hot-reload in development.

**Configuration:**
- Reads `NEUPID_GRPC_HOST` from environment (defaults to `localhost:50051`)
- Uses insecure credentials (no TLS) — **keep this on a private network**

### 3. `lib/verify-session.ts`

Typed wrapper around the gRPC `Verify` RPC. Accepts a session triplet and returns either:
- `{ valid: true, user: NeupUser }` on success
- `{ valid: false, error: string }` on failure

**Type: `NeupUser`**
```ts
{
  accountId: string;
  neupId: string;
  displayName: string;
  displayImage: string;
  accountType: string;
  verified: boolean;
}
```

### 4. `lib/get-identity.ts`

High-level server-side helper that:
1. Reads the `auth_accounts` cookie (via `next/headers` or manual input)
2. Parses the active account (using `services/account/getAccount.ts`)
3. Calls `verifySession` to verify the session triplet
4. Returns `IdentityResult`:
   - `{ authenticated: true, user: NeupUser }` if valid
   - `{ authenticated: false, reason: string }` if invalid

### 5. `services/account/getAccount.ts` (existing)

Parses the `auth_accounts` cookie JSON and extracts the active account (where `def === 1`).

**Type: `ActiveAccount`**
```ts
{
  aid: string;   // account ID
  sid: string;   // session ID
  skey: string;  // session key
}
```

---

## Usage

### In a Server Component

```ts
import { getIdentity } from '@/lib/get-identity';

export default async function DashboardPage() {
  const identity = await getIdentity();

  if (!identity.authenticated) {
    return <div>Please log in. Reason: {identity.reason}</div>;
  }

  return (
    <div>
      <h1>Welcome, {identity.user.displayName}!</h1>
      <p>Account ID: {identity.user.accountId}</p>
      <p>Neup ID: {identity.user.neupId}</p>
    </div>
  );
}
```

### In a Server Action

```ts
'use server';

import { getIdentity } from '@/lib/get-identity';

export async function createPost(formData: FormData) {
  const identity = await getIdentity();

  if (!identity.authenticated) {
    return { error: 'Unauthorized' };
  }

  const userId = identity.user.accountId;
  // ... create post with userId
}
```

### In a Route Handler (API Route)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getIdentity } from '@/lib/get-identity';

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get('auth_accounts')?.value;
  const identity = await getIdentity(cookieValue);

  if (!identity.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ user: identity.user });
}
```

### Direct gRPC Call (Advanced)

If you need more control, you can call `verifySession` directly:

```ts
import { verifySession } from '@/lib/verify-session';
import { getActiveAccount } from '@/services/account/getAccount';

const account = getActiveAccount(cookieValue);
if (!account) {
  // no active session
}

const result = await verifySession({
  sessionId: account.sid,
  sessionKey: account.skey,
  accountId: account.aid,
});

if (result.valid) {
  console.log(result.user.accountId);
} else {
  console.error(result.error);
}
```

---

## Environment Configuration

Add to your `.env` file:

```bash
# NeupID gRPC server address (host:port)
# Internal network only — never expose port 50051 publicly
NEUPID_GRPC_HOST="neupid-internal:50051"
```

**Default:** `localhost:50051` (for local development)

**Production:** Replace with the internal hostname/IP of the NeupID server on your private network.

---

## Security Notes

### 1. **Never expose port 50051 to the public internet**

The gRPC server uses insecure credentials (no TLS). It must only be accessible on a private internal network. Use firewall rules or a service mesh to restrict access.

### 2. **Never pass `sessionKey` to the browser**

The `sessionKey` is a secret credential. It should only be read and used on the server. Never log it, send it to the client, or include it in API responses.

### 3. **The `accountId` alone is not proof of identity**

Always verify the full triplet (`aid`, `sid`, `skey`) via gRPC. A malicious client could send any `accountId` — the gRPC call is what proves the session is valid.

### 4. **Session expiry**

The NeupID server handles session expiry. If a session is expired or invalid, the gRPC call will return `valid: false` with an appropriate error message.

### 5. **Blocked accounts**

If an account is blocked, the gRPC server will return an error like `"This account is currently blocked"`.

---

## Error Handling

The `getIdentity` function returns `{ authenticated: false, reason: string }` in the following cases:

| Reason | Meaning |
|--------|---------|
| `no_request_context` | Called outside of a request context (e.g. during build) |
| `no_active_session` | No `auth_accounts` cookie or no account with `def === 1` |
| `Missing session credentials` | One or more of `aid`, `sid`, `skey` is empty |
| `Invalid or expired session` | Session not found, credentials mismatch, or session expired |
| `Account not found` | The `accountId` does not exist |
| `This account is currently blocked` | Account is blocked permanently or temporarily |
| `internal_server_error` | Something went wrong on the NeupID side |
| (gRPC error message) | Any other gRPC error (e.g. connection refused, timeout) |

---

## Testing

### Local Development

1. Ensure the NeupID gRPC server is running on `localhost:50051`
2. Set `NEUPID_GRPC_HOST=localhost:50051` in `.env.local`
3. Log in via the NeupID auth flow to get an `auth_accounts` cookie
4. Call `getIdentity()` in a Server Component or Server Action
5. Check the console for the returned user object

### Manual gRPC Test (using grpcurl)

```bash
grpcurl -plaintext \
  -d '{"sessionId":"sess_abc","sessionKey":"key_abc","accountId":"acct_abc"}' \
  localhost:50051 \
  auth.AuthService/Verify
```

Expected response:
```json
{
  "valid": true,
  "user": {
    "accountId": "acct_abc123",
    "neupId": "jane.doe",
    "displayName": "Jane Doe",
    "displayImage": "https://neupcdn.com/photos/jane.jpg",
    "accountType": "individual",
    "verified": true
  }
}
```

---

## Alternative: REST whoami Endpoint

If your app is browser-based or cross-origin and cannot use gRPC, use the REST endpoint instead:

**Endpoint:** `GET /bridge/api.v1/auth/whoami`

**Requirements:**
- The request must include cookies (`credentials: 'include'`)
- Your site's origin must be registered as an `authenticatesTo` URL for an application in the NeupID system

**Browser usage:**
```js
const res = await fetch('https://neupid-domain.com/bridge/api.v1/auth/whoami', {
  method: 'GET',
  credentials: 'include',
});

const data = await res.json();
if (data.success) {
  console.log(data.accountId);   // "acct_abc123"
  console.log(data.neupId);      // "jane.doe"
  console.log(data.displayName); // "Jane Doe"
}
```

**Response shape** (same fields as gRPC `User`):
```json
{
  "success": true,
  "accountId": "acct_abc123",
  "neupId": "jane.doe",
  "displayName": "Jane Doe",
  "displayImage": "https://neupcdn.com/photos/jane.jpg",
  "accountType": "individual",
  "verified": true
}
```

---

## Migration from Existing Code

The existing codebase uses a **temporary account** system for anonymous users. This gRPC integration is for **authenticated users only**. You can use both systems in parallel:

1. Check for authenticated user via `getIdentity()`
2. If not authenticated, fall back to `temp_account_id` cookie (existing behavior)

Example:
```ts
const identity = await getIdentity();
const userId = identity.authenticated
  ? identity.user.accountId
  : cookies().get('temp_account_id')?.value ?? null;
```

---

## Troubleshooting

### "Connection refused" error

- Ensure the NeupID gRPC server is running
- Check `NEUPID_GRPC_HOST` is set correctly
- Verify network connectivity (firewall, VPN, etc.)

### "Invalid or expired session" error

- The session may have expired — user needs to log in again
- The session credentials may be incorrect — check the cookie value
- The NeupID server may have restarted and lost session state

### "This account is currently blocked" error

- The user's account has been blocked by an administrator
- Redirect the user to a "blocked" page or show an appropriate message

### Type errors in TypeScript

- Ensure `@grpc/grpc-js` and `@grpc/proto-loader` are installed
- Run `npm install` to install dependencies
- Run `npx tsc --noEmit` to check for type errors

---

## Further Reading

- [gRPC Node.js Guide](https://grpc.io/docs/languages/node/)
- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)
