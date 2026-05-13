# Authentication Error Logging

Comprehensive error logging for authentication failures, JWT verification errors, and cookie reading issues.

## Overview

All authentication errors are automatically logged to:
1. **Console** - Immediate visibility during development
2. **Log File** - Persistent storage at `logs/auth-errors.log`

## Features

✅ **Automatic Logging** - All JWT verification and decoding errors are logged
✅ **Console Output** - Errors appear in console with timestamps
✅ **File Logging** - Persistent logs in `logs/auth-errors.log`
✅ **Token Truncation** - JWT tokens are truncated for security (first/last 10 chars)
✅ **Log Rotation** - Automatic rotation when file exceeds 10MB
✅ **Structured Format** - JSON format for easy parsing
✅ **Stack Traces** - Full stack traces for debugging
✅ **Runtime Detection** - Works in Node.js, gracefully degrades in Edge runtime

## What Gets Logged

### JWT Verification Errors

```typescript
{
  timestamp: "2026-05-13T10:30:45.123Z",
  level: "error",
  error: "JWT verification failed: invalid_signature",
  reason: "invalid_signature",
  token: "eyJhbGciOi...VCJ9.eyJh",  // Truncated
  operation: "jwt_verification"
}
```

### JWT Decoding Errors

```typescript
{
  timestamp: "2026-05-13T10:30:45.123Z",
  level: "error",
  error: "Unexpected token in JSON",
  reason: "jwt_decode_failed",
  token: "malformed...token",
  stack: "Error: Unexpected token...",
  operation: "jwt_decoding"
}
```

### Cookie Reading Errors

```typescript
{
  timestamp: "2026-05-13T10:30:45.123Z",
  level: "error",
  error: "Failed to read cookies",
  reason: "cookie_read_failed",
  operation: "cookie_reading"
}
```

## Error Reasons

| Reason | Description |
|--------|-------------|
| `missing_token` | No JWT token provided |
| `malformed_token` | JWT doesn't have 3 parts (header.payload.signature) |
| `invalid_payload` | Cannot decode JWT payload |
| `missing_aid` | Account ID not in JWT payload |
| `token_expired` | JWT has expired |
| `invalid_signature` | Signature verification failed |
| `verification_error` | Other verification error |
| `jwt_decode_failed` | Failed to decode JWT |
| `cookie_read_failed` | Failed to read cookie |
| `missing_public_key` | AUTH_PUBLIC_KEY not set |
| `public_key_import_failed` | Failed to import RSA public key |

## Console Output

### Error Example

```
[Auth ERROR] 2026-05-13T10:30:45.123Z JWT verification failed: invalid_signature
  Reason: invalid_signature
  Token: eyJhbGciOi...VCJ9.eyJh
```

### Warning Example

```
[Auth WARN] 2026-05-13T10:30:45.123Z Token expired
  Reason: token_expired
```

## Log File Format

Location: `logs/auth-errors.log`

Each line is a JSON object:

```json
{"timestamp":"2026-05-13T10:30:45.123Z","level":"error","error":"JWT verification failed: invalid_signature","reason":"invalid_signature","token":"eyJhbGciOi...VCJ9.eyJh","operation":"jwt_verification"}
{"timestamp":"2026-05-13T10:31:12.456Z","level":"error","error":"Unexpected token in JSON","reason":"jwt_decode_failed","token":"malformed...token","stack":"Error: Unexpected token...","operation":"jwt_decoding"}
```

## Log Rotation

- **Trigger**: When log file exceeds 10MB
- **Action**: Renames current log to `auth-errors-YYYY-MM-DDTHH-MM-SS.log`
- **New File**: Creates fresh `auth-errors.log`

Example:
```
logs/
├── auth-errors.log                    # Current log
├── auth-errors-2026-05-13T10-30-45.log  # Archived
└── auth-errors-2026-05-12T15-20-10.log  # Archived
```

## API Endpoints

### View Recent Logs

```bash
GET /api/auth/logs?lines=100
```

Response:
```json
{
  "count": 100,
  "logs": [
    {
      "timestamp": "2026-05-13T10:30:45.123Z",
      "level": "error",
      "error": "JWT verification failed: invalid_signature",
      "reason": "invalid_signature",
      "token": "eyJhbGciOi...VCJ9.eyJh"
    }
  ]
}
```

**Note**: This endpoint should be protected in production (admin-only).

## Manual Logging

### Log Custom Auth Error

```typescript
import { logAuthError } from '@/services/auth';

await logAuthError('Custom auth error', {
  reason: 'custom_reason',
  token: jwtToken,
  level: 'error',
  userId: 'user-123',
});
```

### Log Warning

```typescript
import { logAuthWarning } from '@/services/auth';

await logAuthWarning('Session about to expire', {
  accountId: 'acc-123',
  expiresIn: 300, // seconds
});
```

### Log Info

```typescript
import { logAuthInfo } from '@/services/auth';

await logAuthInfo('Successful authentication', {
  accountId: 'acc-123',
  method: 'jwt',
});
```

## Reading Logs Programmatically

### Read Last 100 Lines

```typescript
import { readAuthLogs } from '@/services/auth';

const logs = await readAuthLogs(100);

logs.forEach(line => {
  const log = JSON.parse(line);
  console.log(`${log.timestamp}: ${log.error}`);
});
```

### Clear Logs

```typescript
import { clearAuthLogs } from '@/services/auth';

await clearAuthLogs();
// Clears the auth-errors.log file
```

## Security Considerations

### Token Truncation

JWT tokens are automatically truncated to prevent sensitive data leakage:

```typescript
// Original token
"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJhY2MtMTIzIiwic2lkIjoic2Vzcy00NTYifQ.signature"

// Logged token (truncated)
"eyJhbGciOi...VCJ9.eyJh"
```

Only the first and last 10 characters are logged.

### Log File Access

- Log files are stored in `logs/` directory
- Added to `.gitignore` to prevent committing
- Should be protected with proper file permissions in production
- API endpoint should require admin authentication

### Sensitive Data

The logger automatically:
- ✅ Truncates JWT tokens
- ✅ Excludes session keys
- ✅ Excludes passwords
- ✅ Excludes full payloads

## Monitoring

### Check for Errors

```bash
# View recent errors
curl http://localhost:3000/api/auth/logs?lines=50

# Count errors by reason
cat logs/auth-errors.log | jq -r '.reason' | sort | uniq -c

# Find specific error
cat logs/auth-errors.log | jq 'select(.reason == "invalid_signature")'

# Errors in last hour
cat logs/auth-errors.log | jq 'select(.timestamp > "'$(date -u -v-1H +%Y-%m-%dT%H:%M:%S)'")'
```

### Common Patterns

**High rate of `invalid_signature` errors:**
- Wrong public key configured
- Token signed with different key
- Token corruption

**High rate of `token_expired` errors:**
- Users not refreshing sessions
- Token lifetime too short
- Clock skew between servers

**High rate of `malformed_token` errors:**
- Cookie corruption
- Client-side tampering
- Encoding issues

## Development vs Production

### Development

- All errors logged to console
- File logging enabled
- Detailed stack traces
- `/api/auth/logs` endpoint accessible

### Production

- Errors logged to console (captured by logging service)
- File logging enabled
- Stack traces included
- `/api/auth/logs` endpoint should be admin-only
- Consider forwarding logs to external service (e.g., Datadog, Sentry)

## Integration with External Services

### Sentry

```typescript
import * as Sentry from '@sentry/nextjs';
import { logAuthError } from '@/services/auth';

// Override logAuthError to also send to Sentry
const originalLogAuthError = logAuthError;

export async function logAuthError(error: string | Error, context?: any) {
  await originalLogAuthError(error, context);
  
  Sentry.captureException(error, {
    tags: {
      component: 'auth',
      reason: context?.reason,
    },
    extra: context,
  });
}
```

### Datadog

```typescript
import { logAuthError } from '@/services/auth';

// Send to Datadog
export async function logAuthError(error: string | Error, context?: any) {
  await originalLogAuthError(error, context);
  
  // Send to Datadog
  await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': process.env.DATADOG_API_KEY!,
    },
    body: JSON.stringify({
      service: 'auth',
      message: error.toString(),
      ...context,
    }),
  });
}
```

## Troubleshooting

### Logs Not Being Written

**Check runtime:**
```typescript
console.log('Node runtime:', typeof process !== 'undefined' && process.versions?.node);
```

File logging only works in Node.js runtime (Server Components, Route Handlers, Server Actions).

**Check permissions:**
```bash
ls -la logs/
# Should be writable by the Node.js process
```

**Check disk space:**
```bash
df -h
```

### Log File Too Large

Logs automatically rotate at 10MB. If you need manual rotation:

```bash
mv logs/auth-errors.log logs/auth-errors-$(date +%Y%m%d-%H%M%S).log
```

### Cannot Read Logs

```typescript
import { readAuthLogs } from '@/services/auth';

const logs = await readAuthLogs(10);
if (logs.length === 0) {
  console.log('No logs found or file reading not available');
}
```

## Best Practices

1. **Monitor regularly** - Check logs daily for patterns
2. **Set up alerts** - Alert on high error rates
3. **Rotate logs** - Archive old logs periodically
4. **Protect access** - Require admin auth for log endpoints
5. **Forward to external service** - Use Sentry, Datadog, etc. in production
6. **Don't log sensitive data** - Tokens are already truncated
7. **Clean up old logs** - Delete archived logs after retention period

## Example: Monitoring Dashboard

```typescript
// app/admin/auth-logs/page.tsx
import { readAuthLogs } from '@/services/auth';
import { requireRegisteredAuth } from '@/services/auth';

export default async function AuthLogsPage() {
  await requireRegisteredAuth(); // Admin only
  
  const logs = await readAuthLogs(100);
  const parsed = logs.map(line => JSON.parse(line));
  
  // Group by reason
  const byReason = parsed.reduce((acc, log) => {
    acc[log.reason] = (acc[log.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div>
      <h1>Auth Error Logs</h1>
      
      <h2>Error Summary</h2>
      <ul>
        {Object.entries(byReason).map(([reason, count]) => (
          <li key={reason}>{reason}: {count}</li>
        ))}
      </ul>
      
      <h2>Recent Errors</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Error</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {parsed.slice(0, 20).map((log, i) => (
            <tr key={i}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.error}</td>
              <td>{log.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Summary

- ✅ All auth errors automatically logged
- ✅ Console + file logging
- ✅ Secure token truncation
- ✅ Automatic log rotation
- ✅ API endpoint for viewing logs
- ✅ Manual logging functions available
- ✅ Production-ready with external service integration
