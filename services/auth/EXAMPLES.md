# Authentication Service Examples

Complete examples for using the centralized authentication service.

## Table of Contents

1. [Quick Start - requireAuth](#quick-start---requireauth)
2. [Basic Authentication Check](#basic-authentication-check)
3. [Route Handlers](#route-handlers)
4. [Server Components](#server-components)
5. [Server Actions](#server-actions)
6. [Client Components](#client-components)
7. [Middleware Integration](#middleware-integration)
8. [Error Handling](#error-handling)
9. [Session Management](#session-management)

## Quick Start - requireAuth

The simplest way to protect pages and API routes. Automatically redirects to NeupID login if not authenticated.

### Protected Server Component

```typescript
// app/dashboard/page.tsx
import { requireAuth } from '@/services/auth';

export default async function DashboardPage() {
  // This single line handles everything:
  // - Reads cookie
  // - Verifies JWT
  // - Redirects to login if not authenticated
  const account = await requireAuth();
  
  // If we reach here, user is authenticated
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Account ID: {account.aid}</p>
      <p>NeupID: {account.nid}</p>
      <p>Session ID: {account.sid}</p>
      {account.guest === 1 && <p>Guest Account</p>}
    </div>
  );
}
```

### Protected API Route

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/services/auth';

export async function GET(request: NextRequest) {
  // Pass request to include current URL in redirect
  const account = await requireAuth(request);
  
  // If we reach here, user is authenticated
  return NextResponse.json({
    accountId: account.aid,
    neupId: account.nid,
    sessionId: account.sid,
  });
}

export async function POST(request: NextRequest) {
  const account = await requireAuth(request);
  
  const body = await request.json();
  
  // Process authenticated request...
  return NextResponse.json({ success: true });
}
```

### Require Registered User (No Guests)

```typescript
// app/admin/page.tsx
import { requireRegisteredAuth } from '@/services/auth';

export default async function AdminPage() {
  // Only allows registered users (not guests)
  const account = await requireRegisteredAuth();
  
  // account.nid is guaranteed to exist
  // account.guest is guaranteed to be undefined or 0
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Admin: @{account.nid}</p>
    </div>
  );
}
```

### Server Action with Auth

```typescript
// app/actions.ts
'use server';

import { requireAuth } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function updateProfile(formData: FormData) {
  const account = await requireAuth();
  
  const displayName = formData.get('displayName') as string;
  
  await prisma.account.update({
    where: { id: account.aid },
    data: { displayName },
  });
  
  return { success: true };
}
```

### Why Use requireAuth?

**Before (manual handling):**
```typescript
const result = await getAuthenticatedAccount();
if (!result.success) {
  redirect('https://neupgroup.com/account/auth/start');
}
const account = result.account;
```

**After (one line):**
```typescript
const account = await requireAuth();
```

Benefits:
- ✅ Single line of code
- ✅ Automatic redirect to NeupID
- ✅ Includes current URL in redirect
- ✅ Type-safe (account is guaranteed)
- ✅ No need to check result.success
- ✅ Cleaner, more readable code

## Basic Authentication Check

### Simple Auth Check

```typescript
import { getAuthenticatedAccount } from '@/services/auth';

async function checkAuth() {
  const result = await getAuthenticatedAccount();
  
  if (result.success) {
    console.log('Authenticated!');
    console.log('Account ID:', result.account.aid);
    console.log('NeupID:', result.account.nid);
    console.log('Is Guest:', result.account.guest === 1);
  } else {
    console.log('Not authenticated:', result.reason);
  }
}
```

### Get Account ID Only

```typescript
import { getAccountId } from '@/services/auth';

async function getUserId() {
  const accountId = await getAccountId();
  
  if (accountId) {
    console.log('User ID:', accountId);
  } else {
    console.log('No authenticated user');
  }
}
```

### Check User Type

```typescript
import { isAuthenticated, isGuest, isIdentified } from '@/services/auth';

async function checkUserType() {
  const authenticated = await isAuthenticated(); // Registered user
  const guest = await isGuest();                 // Guest user
  const identified = await isIdentified();       // Any user (guest or registered)
  
  if (authenticated) {
    console.log('Registered user');
  } else if (guest) {
    console.log('Guest user');
  } else if (identified) {
    console.log('Identified but incomplete session');
  } else {
    console.log('Not identified');
  }
}
```

## Route Handlers

### Protected API Endpoint

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Verify authentication
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        reason: result.reason,
        redirectTo: 'https://neupgroup.com/account/auth/start'
      },
      { status: 401 }
    );
  }

  // Fetch user data
  const account = await prisma.account.findUnique({
    where: { id: result.account.aid },
    select: {
      id: true,
      displayName: true,
      displayImage: true,
      accountType: true,
    },
  });

  return NextResponse.json({
    accountId: result.account.aid,
    neupId: result.account.nid,
    isGuest: result.account.guest === 1,
    ...account,
  });
}
```

### POST Endpoint with Auth

```typescript
// app/api/properties/favorite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccountId } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const accountId = await getAccountId();
  
  if (!accountId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { propertyId } = await req.json();

  await prisma.savedProperty.create({
    data: {
      accountId,
      propertyId,
    },
  });

  return NextResponse.json({ success: true });
}
```

### Admin-Only Endpoint

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAccount } from '@/services/auth';

const ADMIN_ACCOUNT_IDS = ['admin-id-1', 'admin-id-2'];

export async function GET(req: NextRequest) {
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  if (!ADMIN_ACCOUNT_IDS.includes(result.account.aid)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin logic here...
  return NextResponse.json({ users: [] });
}
```

## Server Components

### Protected Page

```typescript
// app/dashboard/page.tsx
import { getAuthenticatedAccount } from '@/services/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    redirect('/login');
  }

  const account = await prisma.account.findUnique({
    where: { id: result.account.aid },
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {account?.displayName || result.account.aid}</p>
      <p>NeupID: {result.account.nid}</p>
      {result.account.guest === 1 && (
        <p className="text-yellow-600">You are browsing as a guest</p>
      )}
    </div>
  );
}
```

### Conditional Rendering

```typescript
// app/properties/[id]/page.tsx
import { isAuthenticated, getAccountId } from '@/services/auth';
import { SaveButton } from './save-button';
import { LoginPrompt } from './login-prompt';

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const authenticated = await isAuthenticated();
  const accountId = await getAccountId();

  return (
    <div>
      <h1>Property Details</h1>
      
      {authenticated ? (
        <SaveButton propertyId={params.id} accountId={accountId!} />
      ) : (
        <LoginPrompt />
      )}
    </div>
  );
}
```

### User Profile Header

```typescript
// components/profile-header.tsx
import { getAuthenticatedAccount, getAccountInfo } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function ProfileHeader() {
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    return <div>Not logged in</div>;
  }

  const account = await prisma.account.findUnique({
    where: { id: result.account.aid },
    select: {
      displayName: true,
      displayImage: true,
    },
  });

  return (
    <div className="flex items-center gap-4">
      {account?.displayImage && (
        <img 
          src={account.displayImage} 
          alt={account.displayName || 'User'} 
          className="w-12 h-12 rounded-full"
        />
      )}
      <div>
        <h2>{account?.displayName || 'User'}</h2>
        <p className="text-sm text-gray-500">@{result.account.nid}</p>
      </div>
    </div>
  );
}
```

## Server Actions

### Update Profile Action

```typescript
// app/actions.ts
'use server';

import { getAccountId, isAuthenticated } from '@/services/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const accountId = await getAccountId();
  
  if (!accountId) {
    throw new Error('Not authenticated');
  }

  const displayName = formData.get('displayName') as string;

  await prisma.account.update({
    where: { id: accountId },
    data: { displayName },
  });

  revalidatePath('/profile');
  
  return { success: true };
}
```

### Save Property Action

```typescript
// app/actions.ts
'use server';

import { getAccountId } from '@/services/auth';
import { prisma } from '@/lib/prisma';

export async function saveProperty(propertyId: string) {
  const accountId = await getAccountId();
  
  if (!accountId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    await prisma.savedProperty.create({
      data: {
        accountId,
        propertyId,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save property' };
  }
}
```

### gRPC Call with Session

```typescript
// app/actions.ts
'use server';

import { getSessionTriplet } from '@/services/auth';
import { callGrpcService } from '@/lib/grpc-client';

export async function verifySession() {
  const session = await getSessionTriplet();
  
  if (!session) {
    return { verified: false, error: 'No valid session' };
  }

  const { aid, sid, skey } = session;

  try {
    const result = await callGrpcService({
      accountId: aid,
      sessionId: sid,
      sessionKey: skey,
    });

    return { verified: true, result };
  } catch (error) {
    return { verified: false, error: 'Verification failed' };
  }
}
```

## Client Components

### Display User Info (Unverified)

```typescript
// components/user-badge.tsx
'use client';

import { useEffect, useState } from 'react';
import { getClientAccountId, isClientAuthenticated } from '@/services/auth';

export function UserBadge() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // WARNING: This is unverified, don't use for security decisions
    const id = getClientAccountId();
    const auth = isClientAuthenticated();
    
    setAccountId(id);
    setAuthenticated(auth);
  }, []);

  if (!accountId) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <span>Account: {accountId}</span>
      {authenticated && <span className="ml-2 text-green-600">✓ Verified</span>}
    </div>
  );
}
```

### Conditional UI

```typescript
// components/save-button.tsx
'use client';

import { useEffect, useState } from 'react';
import { isClientAuthenticated } from '@/services/auth';
import { saveProperty } from '@/app/actions';

export function SaveButton({ propertyId }: { propertyId: string }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isClientAuthenticated());
  }, []);

  const handleSave = async () => {
    if (!authenticated) {
      window.location.href = '/login';
      return;
    }

    await saveProperty(propertyId);
  };

  return (
    <button onClick={handleSave}>
      {authenticated ? 'Save Property' : 'Login to Save'}
    </button>
  );
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { getAuthenticatedAccount } from '@/services/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    switch (result.reason) {
      case 'no_cookie':
        return NextResponse.json(
          { error: 'No authentication cookie found' },
          { status: 401 }
        );
      
      case 'token_expired':
        return NextResponse.json(
          { error: 'Session expired', redirectTo: '/login' },
          { status: 401 }
        );
      
      case 'invalid_signature':
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      
      case 'missing_aid':
        return NextResponse.json(
          { error: 'Incomplete session data' },
          { status: 401 }
        );
      
      default:
        return NextResponse.json(
          { error: 'Authentication failed', reason: result.reason },
          { status: 401 }
        );
    }
  }

  // Success case
  return NextResponse.json({ accountId: result.account.aid });
}
```

### Graceful Degradation

```typescript
import { getAuthenticatedAccount } from '@/services/auth';

export default async function HomePage() {
  const result = await getAuthenticatedAccount();

  // Show personalized content if authenticated
  if (result.success) {
    return (
      <div>
        <h1>Welcome back, {result.account.nid}!</h1>
        <PersonalizedContent accountId={result.account.aid} />
      </div>
    );
  }

  // Show public content if not authenticated
  return (
    <div>
      <h1>Welcome to our site</h1>
      <PublicContent />
      <LoginPrompt />
    </div>
  );
}
```

## Session Management

### Get Full Session Info

```typescript
import { getAccountInfo } from '@/services/auth';

export async function getSessionInfo() {
  const info = await getAccountInfo();
  
  if (!info) {
    return null;
  }

  return {
    accountId: info.aid,
    sessionId: info.sid,
    sessionKey: info.skey,
    neupId: info.nid,
    isGuest: info.guest,
  };
}
```

### Session Validation

```typescript
import { getSessionTriplet } from '@/services/auth';

export async function validateSession() {
  const session = await getSessionTriplet();
  
  if (!session) {
    return { valid: false, reason: 'No session' };
  }

  const { aid, sid, skey } = session;

  // Validate with backend
  const response = await fetch('/api/validate-session', {
    method: 'POST',
    body: JSON.stringify({ aid, sid, skey }),
  });

  if (!response.ok) {
    return { valid: false, reason: 'Session invalid' };
  }

  return { valid: true };
}
```

## Testing Examples

### Mock Authentication for Tests

```typescript
// __tests__/auth.test.ts
import { getAuthenticatedAccount } from '@/services/auth';

// Mock the cookie reading
jest.mock('@/services/auth/cookie', () => ({
  getAuthCookieServer: jest.fn(),
}));

describe('Authentication', () => {
  it('should return success for valid token', async () => {
    const mockToken = 'valid.jwt.token';
    
    // Mock implementation
    require('@/services/auth/cookie').getAuthCookieServer.mockResolvedValue(mockToken);

    const result = await getAuthenticatedAccount();
    
    expect(result.success).toBe(true);
  });

  it('should return failure for missing token', async () => {
    require('@/services/auth/cookie').getAuthCookieServer.mockResolvedValue(null);

    const result = await getAuthenticatedAccount();
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_cookie');
  });
});
```

## Best Practices

1. **Always use server-side verification for security decisions**
   ```typescript
   // ✅ Good
   const result = await getAuthenticatedAccount();
   if (result.success) { /* allow access */ }
   
   // ❌ Bad (client-side is unverified)
   const account = getClientAccount();
   if (account) { /* allow access */ }
   ```

2. **Handle all error cases**
   ```typescript
   // ✅ Good
   const result = await getAuthenticatedAccount();
   if (!result.success) {
     console.log('Auth failed:', result.reason);
     return redirect('/login');
   }
   
   // ❌ Bad (assumes success)
   const result = await getAuthenticatedAccount();
   const accountId = result.account.aid; // May crash
   ```

3. **Use specific helper functions when possible**
   ```typescript
   // ✅ Good (cleaner)
   const accountId = await getAccountId();
   
   // ❌ Less ideal (more verbose)
   const result = await getAuthenticatedAccount();
   const accountId = result.success ? result.account.aid : null;
   ```

4. **Cache authentication results in the same request**
   ```typescript
   // ✅ Good (call once, reuse result)
   const result = await getAuthenticatedAccount();
   const accountId = result.account.aid;
   const neupId = result.account.nid;
   
   // ❌ Bad (multiple calls)
   const accountId = await getAccountId();
   const info = await getAccountInfo();
   ```
