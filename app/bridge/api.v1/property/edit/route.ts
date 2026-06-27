/**
 * POST /bridge/api.v1/property/edit
 *
 * requestId: edit an uncreated pending create request
 * propertyId: submit a change request for an approved property
 */

import { NextRequest } from 'next/server';
import { handleBridgePropertyEdit } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => {
  try {
    return await handleBridgePropertyEdit(req);
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property/edit:POST');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property/edit:POST' }, postHandler);
