/**
 * GET /bridge/api.v1/property/list
 *
 * Returns active properties linked to an agency or account id.
 *
 * Query params (exactly one required):
 *   ?agency_id=<accountId>&fields=id,title,price&limit=20&offset=0
 *   ?account_id=<accountId>&fields=id,title,price&limit=20&offset=0
 *
 * Legacy aliases are also accepted:
 *   ?agency=<accountId>
 *   ?agent=<accountId>
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
      filterTypeLabel: 'account',
      routeLabel: 'bridge/api.v1/property/list',
    });
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property/list');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property/list' }, getHandler);
