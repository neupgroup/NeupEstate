/*
::neup.documentation::bridge-activities
::api POST /bridge/api.v1/activities
::public

Accepts property activity events for an authenticated user.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { logListingViews } from '@/services/listings/single/views';
import type { ListingActivityEvent } from '@/types';
import { getAuthCookieServer } from '@/services/auth/cookie';
import { logica } from '@neup/logica';

export const dynamic = 'force-dynamic';

// Validate and record activity events for the authenticated account.
const postHandler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { propertyId, events } = body as {
      propertyId?: string;
      events: ListingActivityEvent[];
    };

    if (!events) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const token = await getAuthCookieServer();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const verification = await logica.account.auth.verify(token);
    const userId = verification?.payload?.aid as string | undefined;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await logListingViews(userId, events, propertyId);

    return NextResponse.json({ message: 'Activity received.' }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }
};

export const POST = postHandler;
