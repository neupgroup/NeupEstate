
import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/app/actions';
import type { PropertyActivityEvent } from '@/types';
import { withRequestDevLog } from '@/services/site-dev-log-service';

const postHandler = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { userId, propertyId, events } = body as {
      userId: string;
      propertyId?: string; // Property ID is now optional
      events: PropertyActivityEvent[];
    };

    if (!userId || !events) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    
    // We don't need to wait for this to complete
    logUserActivity(userId, events, propertyId);

    return NextResponse.json({ message: 'Activity received.' }, { status: 202 });
  } catch (error) {
    console.error('Error in /api/log-activity:', error);
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }
};

export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/log-activity' }, postHandler);
