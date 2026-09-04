/*
::neup.documentation::bridge-activities
::api POST /bridge/api.v1/activities
::public

Accepts property activity events for an authenticated user.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/services/communications';
import type { PropertyActivityEvent } from '@/types';
import { withRequestDevLog } from '@/services/site-dev-log-service';
import { getAuthCookieServer } from '@/services/auth/cookie';
import { accountAuthToken } from '@/services/auth/token';

export const dynamic = 'force-dynamic';

const postHandler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { propertyId, events } = body as {
      propertyId?: string;
      events: PropertyActivityEvent[];
    };

    if (!events) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const token = await getAuthCookieServer();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const verification = await accountAuthToken(token).validate();
    const userId = verification?.payload?.aid as string | undefined;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await logUserActivity(userId, events, propertyId);

    return NextResponse.json({ message: 'Activity received.' }, { status: 202 });
  } catch (error) {
    console.error('Error in /bridge/api.v1/activities:', error);
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }
};

export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/activities:POST' }, postHandler);
