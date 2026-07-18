/*
::neup.documentation::bridge-property-search-route
::api GET /bridge/api.v1/property/search

::public

Searches active properties using bridge query parameters.

::public end

::private

This route delegates search parsing and execution to
`handleBridgePropertySearch()` so route code stays composition-only.

::private end

::end
*/

import { NextRequest } from 'next/server';
import { handleBridgePropertySearch } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  try {
    return await handleBridgePropertySearch(req);
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property/search:GET');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/property/search:GET' }, getHandler);
