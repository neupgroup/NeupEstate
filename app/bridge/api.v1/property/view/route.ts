/*
::neup.documentation::bridge-property-view-route
::api GET /bridge/api.v1/property/view

::public

Fetches one property's public bridge payload by `propertyId`.

::public end

::private

This route delegates payload shaping to `handleBridgePropertyView()` and keeps
request logging consistent with the other bridge property endpoints.

::private end

::end
*/

import { NextRequest } from 'next/server';
import { handleBridgePropertyView } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  try {
    return await handleBridgePropertyView(req);
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property/view:GET');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property/view:GET' }, getHandler);
