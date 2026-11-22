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
    const { slug, events } = body as {
      slug?: string;
      events: ListingActivityEvent[];
    };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    if (slug !== undefined && typeof slug !== 'string') {
      return NextResponse.json({ success: false, error: 'slug must be a non-empty canonical listing slug--id value.' }, { status: 400 });
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

    const result = await logListingViews(userId, events, slug);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Unable to record activity.' }, { status: result.error === 'Property not found.' ? 404 : 400 });
    }

    return NextResponse.json({ message: 'Activity received.' }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }
};

export const POST = postHandler;
