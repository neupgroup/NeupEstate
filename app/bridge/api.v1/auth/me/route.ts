/**
 * ::neup.documentation::bridge-auth-me-route
 * ::api GET /bridge/api.v1/auth/me
 *
 * Returns the authenticated account summary used by the app shell.
 *
 * ::public
 *
 * This route returns the current authenticated account context, including:
 * - account id
 * - public identity fields
 * - guest and registered status
 * - working profile information
 *
 * Response behavior:
 * - `200` with authenticated account data when authentication succeeds
 * - `401` with a redirect target when authentication is missing or invalid
 *
 * ::public end
 *
 * ::private
 *
 * The route is a thin wrapper around `getAuthenticatedMeResponse(req)`. The real
 * resolution logic lives in `services/auth/me.ts`, where bridge auth state is
 * merged with local account data and working-profile metadata.
 *
 * `dynamic = 'force-dynamic'` is required because the response depends on
 * request cookies and current authenticated state.
 *
 * ::private end
 * ::end
 */
import { NextRequest } from 'next/server';
import { getAuthenticatedMeResponse } from '@/services/auth/me';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  return getAuthenticatedMeResponse(req);
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/me' }, getHandler);
