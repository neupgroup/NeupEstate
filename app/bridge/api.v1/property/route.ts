/**
 * Legacy alias for GET /bridge/api.v1/property/list
 */

import { NextRequest } from 'next/server';
import { handleBridgePropertyList } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  try {
    return await handleBridgePropertyList(req, {
      allowLegacyAliases: true,
      filterTypeLabel: 'agent',
      routeLabel: 'bridge/api.v1/property',
    });
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property' }, getHandler);
