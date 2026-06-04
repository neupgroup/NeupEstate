# Quick Start Guide - Authentication Service

The simplest way to add authentication to your Next.js pages and API routes.

## One-Line Authentication

### Protect a Page

```typescript
// app/profile/page.tsx
import { requireAuth } from '@/services/auth';

export default async function ProfilePage() {
  const account = await requireAuth();
  
  return <div>Welcome, {account.nid}!</div>;
}
```

That's it! If the user is not authenticated, they'll be automatically redirected to:
```
https://neupgroup.com/account/auth/start?redirectsTo=<current-page>
```

### Protect an API Route

```typescript
// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/services/auth';

export async function GET(request: NextRequest) {
  const account = await requireAuth(request);
  
  return NextResponse.json({ 
    accountId: account.aid,
    neupId: account.nid 
  });
}
```

### Protect a Server Action

```typescript
// app/actions.ts
'use server';

import { requireAuth } from '@/services/auth';

export async function saveData(formData: FormData) {
  const account = await requireAuth();
  
  // Save data for account.aid
  return { success: true };
}
```

## What You Get

The `account` object contains:

```typescript
{
  aid: string;      // Account ID (always present)
  sid?: string;     // Session ID
  skey?: string;    // Session key
  nid?: string;     // NeupID handle (e.g., "neupcloud")
  guest?: number;   // 1 for guest accounts, undefined for registered
  iat?: number;     // Issued at (Unix timestamp)
  exp?: number;     // Expiry (Unix timestamp)
}
```

## Require Registered Users Only

If you want to exclude guest accounts:

```typescript
import { requireRegisteredAuth } from '@/services/auth';

export default async function AdminPage() {
  const account = await requireRegisteredAuth();
  
  // account.nid is guaranteed to exist
  // account.guest is guaranteed to be undefined
  
  return <div>Admin: @{account.nid}</div>;
}
```

## Check Without Redirect

If you want to check authentication without redirecting:

```typescript
import { getAuthenticatedAccount } from '@/services/auth';

export default async function HomePage() {
  const result = await getAuthenticatedAccount();
  
  if (result.success) {
    return <div>Welcome back, {result.account.nid}!</div>;
  }
  
  return <div>Welcome, guest! <a href="/login">Login</a></div>;
}
```

## Common Patterns

### Get Just the Account ID

```typescript
import { getAccountId } from '@/services/auth';

const accountId = await getAccountId(); // string | null
```

### Get Session Triplet (for gRPC calls)

```typescript
import { getSessionTriplet } from '@/services/auth';

const session = await getSessionTriplet();
if (session) {
  const { aid, sid, skey } = session;
  // Use for gRPC authentication
}
```

### Check User Type

```typescript
import { isAuthenticated, isGuest } from '@/services/auth';

const authenticated = await isAuthenticated(); // Registered user
const guest = await isGuest();                 // Guest user
```

## Client-Side (Unverified)

⚠️ **Warning:** Client-side functions only decode the JWT without verifying the signature. Do NOT use for security decisions.

```typescript
'use client';

import { getClientAccountId } from '@/services/auth';

export function ClientComponent() {
  const accountId = getClientAccountId(); // Unverified!
  
  return <div>Account: {accountId}</div>;
}
```

## Error Handling

`requireAuth()` automatically redirects, so you don't need error handling:

```typescript
// ✅ Simple - no error handling needed
const account = await requireAuth();
// If we reach here, user is authenticated
```

If you need custom error handling, use `getAuthenticatedAccount()`:

```typescript
// ✅ Custom error handling
const result = await getAuthenticatedAccount();

if (!result.success) {
  switch (result.reason) {
    case 'token_expired':
      return <div>Session expired. Please login again.</div>;
    case 'invalid_signature':
      return <div>Invalid session. Please login.</div>;
    default:
      return <div>Please login to continue.</div>;
  }
}

const account = result.account;
```

## Complete Example

```typescript
// app/dashboard/page.tsx
import { requireAuth } from '@/services/auth';
import { prisma } from '@/logica/core/prisma';

export default async function DashboardPage() {
  // One line - handles everything
  const account = await requireAuth();
  
  // Fetch user data
  const user = await prisma.account.findUnique({
    where: { id: account.aid },
    select: {
      displayName: true,
      displayImage: true,
    },
  });
  
  return (
    <div>
      <h1>Dashboard</h1>
      <div>
        <img src={user?.displayImage || '/default-avatar.png'} />
        <p>{user?.displayName || account.nid}</p>
      </div>
      
      {account.guest === 1 && (
        <div className="alert">
          You're browsing as a guest. 
          <a href="/register">Create an account</a>
        </div>
      )}
      
      <div>
        <p>Account ID: {account.aid}</p>
        <p>Session ID: {account.sid}</p>
      </div>
    </div>
  );
}
```

## Migration from Old Code

### Before

```typescript
import { cookies } from 'next/headers';
import { getAccountFromCookie } from '@/services/account/cookie-account';

export default async function Page() {
  const store = await cookies();
  const raw = store.get('auth_account')?.value ?? null;
  const result = await getAccountFromCookie(raw);
  
  if (!result.success) {
    redirect('https://neupgroup.com/account/auth/start');
  }
  
  const account = result.account;
  // Use account...
}
```

### After

```typescript
import { requireAuth } from '@/services/auth';

export default async function Page() {
  const account = await requireAuth();
  // Use account...
}
```

**5 lines → 1 line!** 🎉

## Environment Variables

Required in `.env`:

```bash
AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## What Happens Behind the Scenes

When you call `requireAuth()`:

1. ✅ Reads `auth_account` cookie
2. ✅ Validates JWT format
3. ✅ Decodes payload
4. ✅ Checks required fields (aid, sid, skey)
5. ✅ Checks expiry
6. ✅ **Verifies signature** using RSA public key (RS256)
7. ✅ Returns verified account OR redirects to login

All in one function call!

## Next Steps

- See [README.md](./README.md) for complete documentation
- See [EXAMPLES.md](./EXAMPLES.md) for more examples
- See [CHANGELOG.md](./CHANGELOG.md) for version history
