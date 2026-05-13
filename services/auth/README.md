# Authentication Service

Centralized authentication service for handling `auth_account` JWT cookie verification and account information retrieval.

## Overview

This service provides a unified interface for:
1. Reading the `auth_account` cookie (client and server)
2. Verifying JWT signatures using the RSA public key
3. Extracting account information (aid, sid, skey, nid, guest status)

## Architecture

```
services/auth/
├── index.ts        # Main exports
├── account.ts      # High-level auth functions
├── cookie.ts       # Cookie reading (client & server)
└── jwt.ts          # JWT verification & decoding
```

## Usage

### Quick Start (Simplest)

**Protect a page (auto-redirect if not authenticated):**
```typescript
import { requireAuth } from '@/services/auth';

export default async function ProfilePage() {
  const account = await requireAuth();
  // User is guaranteed to be authenticated here
  
  return <div>Account ID: {account.aid}</div>;
}
```

**Protect an API route:**
```typescript
import { requireAuth } from '@/services/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const account = await requireAuth(request);
  // User is guaranteed to be authenticated here
  
  return NextResponse.json({ accountId: account.aid });
}
```

### Detailed Usage

### Server-Side (Verified Authentication)

**Require authentication (simplest - auto-redirects):**
```typescript
import { requireAuth } from '@/services/auth';

// In a Server Component
export default async function ProtectedPage() {
  const account = await requireAuth();
  // If we get here, user is authenticated
  // account contains: aid, sid, skey, nid, guest
  
  return <div>Welcome, {account.nid}!</div>;
}

// In a Route Handler
export async function GET(request: NextRequest) {
  const account = await requireAuth(request);
  // If we get here, user is authenticated
  
  return NextResponse.json({ accountId: account.aid });
}
```

**Require registered user (no guests):**
```typescript
import { requireRegisteredAuth } from '@/services/auth';

export default async function AdminPage() {
  const account = await requireRegisteredAuth();
  // If we get here, user is registered (not a guest)
  // account.nid is guaranteed to exist
  
  return <div>Admin: {account.nid}</div>;
}
```

**Get authenticated account (recommended):**
```typescript
import { getAuthenticatedAccount } from '@/services/auth';

const result = await getAuthenticatedAccount();
if (!result.success) {
  // Redirect to login
  console.log('Auth failed:', result.reason);
  return;
}

// Use verified account data
console.log('Account ID:', result.account.aid);
console.log('NeupID:', result.account.nid);
console.log('Is guest:', result.account.guest === 1);
```

**Get account ID only:**
```typescript
import { getAccountId } from '@/services/auth';

const accountId = await getAccountId(); // string | null
```

**Get session triplet (aid, sid, skey):**
```typescript
import { getSessionTriplet } from '@/services/auth';

const session = await getSessionTriplet();
if (session) {
  const { aid, sid, skey } = session;
  // Use for gRPC calls, etc.
}
```

**Check authentication status:**
```typescript
import { isAuthenticated, isIdentified, isGuest } from '@/services/auth';

// Registered, non-guest account
const authenticated = await isAuthenticated();

// Any account (registered or guest)
const identified = await isIdentified();

// Guest account
const guest = await isGuest();
```

### Client-Side (Unverified, Decode Only)

⚠️ **WARNING:** Client-side functions only decode the JWT without verifying the signature. Do NOT use for security-critical decisions.

```typescript
import { getClientAccount, getClientAccountId } from '@/services/auth';

// Get full account data (unverified)
const account = getClientAccount();

// Get account ID only (unverified)
const accountId = getClientAccountId();
```

### Direct JWT Operations

**Verify JWT:**
```typescript
import { verifyAuthJWT } from '@/services/auth';

const result = await verifyAuthJWT(token);
if (result.valid) {
  console.log('Verified payload:', result.payload);
} else {
  console.log('Verification failed:', result.reason);
}
```

**Decode JWT (no verification):**
```typescript
import { decodeAuthJWT } from '@/services/auth';

const payload = decodeAuthJWT(token);
```

## JWT Payload Structure

```typescript
{
  aid: string;      // Account ID (always present)
  sid?: string;     // Session ID
  skey?: string;    // Session key
  nid?: string;     // NeupID handle (registered accounts only)
  guest?: number;   // 1 for guest accounts, absent for registered
  iat?: number;     // Issued at (Unix timestamp)
  exp?: number;     // Expiry (Unix timestamp)
}
```

## Verification Process

1. **Cookie Reading**: Reads `auth_account` cookie from Next.js server context
2. **Token Validation**: Checks token format and required fields
3. **Expiry Check**: Verifies token hasn't expired
4. **Signature Verification**: Uses RSA public key from `AUTH_PUBLIC_KEY` env var
5. **Result**: Returns verified account data or error reason

## Error Reasons

- `no_cookie` - Cookie not found
- `missing_token` - Token is null/undefined
- `malformed_token` - Invalid JWT format
- `invalid_payload` - Cannot decode payload
- `missing_aid` - Account ID not in payload
- `token_expired` - Token has expired
- `invalid_signature` - Signature verification failed
- `verification_error` - Other verification error

## Environment Variables

```bash
# RSA public key for JWT verification (RS256, SPKI PEM format)
# Newlines must be escaped as \n
AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## Migration from Old Services

Old services in `services/account/` are now deprecated but kept for backward compatibility:

- `services/account/cookie-account.ts` → Use `services/auth`
- `services/account/get-account-id.ts` → Use `services/auth`
- `services/account/getAccount.ts` → Use `services/auth`

Old code will continue to work as these files now delegate to the new centralized service.

## Examples

### Route Handler
```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount } from '@/services/auth';

export async function GET(req: NextRequest) {
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Unauthorized', reason: result.reason },
      { status: 401 }
    );
  }

  return NextResponse.json({
    accountId: result.account.aid,
    neupId: result.account.nid,
  });
}
```

### Server Component
```typescript
// app/profile/page.tsx
import { getAuthenticatedAccount } from '@/services/auth';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Account ID: {result.account.aid}</p>
      <p>NeupID: {result.account.nid}</p>
    </div>
  );
}
```

### Server Action
```typescript
// app/actions.ts
'use server';

import { getAccountId } from '@/services/auth';

export async function updateProfile(formData: FormData) {
  const accountId = await getAccountId();
  
  if (!accountId) {
    throw new Error('Not authenticated');
  }

  // Update profile...
}
```

## Testing

The service handles various edge cases:
- Missing cookie
- Malformed JWT
- Expired token
- Invalid signature
- Missing required fields
- Environment variable not set

All errors are returned as structured results, never thrown as exceptions.
