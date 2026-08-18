import { NextRequest } from 'next/server';
import { getAuthCookieServer } from '@/services/auth/cookie';
import { accountAuthToken } from '@/services/auth/token';
import { logUserActivity } from '@/services/communications';
import type { PropertyActivityEvent } from '@/types';

export const dynamic = 'force-dynamic';

interface ActivityRequestBody {
  events: PropertyActivityEvent[];
  propertyId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthCookieServer();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const verification = await accountAuthToken(token).validate();
    if (!verification || !verification.payload?.aid) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = verification.payload.aid as string;
    const body = (await req.json()) as ActivityRequestBody;
    const events = body.events;
    const propertyId = body.propertyId;

    const result = await logUserActivity(userId, events, propertyId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
}
