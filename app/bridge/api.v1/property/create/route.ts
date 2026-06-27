/**
 * POST /bridge/api.v1/property/create
 *
 * Accepts property-create payloads and saves them as review-required drafts.
 */

import { NextRequest } from 'next/server';
import { handleBridgePropertyCreate } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => {
  try {
    return await handleBridgePropertyCreate(req);
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property/create:POST');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property/create:POST' }, postHandler);
