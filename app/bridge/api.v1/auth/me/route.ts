import { NextRequest } from 'next/server';
import { getAuthenticatedMeResponse } from '@/services/auth/me';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  return getAuthenticatedMeResponse(req);
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/me' }, getHandler);
