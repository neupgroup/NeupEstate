/*
::neup.documentation::bridge-properties-collection
::api GET|POST /bridge/api.v1/properties

::public

GET returns active properties in a paginated response. It accepts `limit` and
`offset`, plus `search` for term search, `agency` or `agent` for ownership
filtering, and `orderBy=newestFirst|oldestFirst` for creation/update order.
Additional property filters such as `location`, `purpose`, `category`,
`minPrice`, `maxPrice`, `minBedrooms`, and `maxBedrooms` are supported.

GET response fields include `success`, `properties`, `totalCount`, `page`,
`limit`, `totalPages`, and `appliedFilters`. Properties are limited to active
approved listings by default.

POST creates a property submission as an awaiting-review draft. The request
body must include `accountId` and a `property` object, or the equivalent
account header and property payload. The response includes `requestId` and
the review `status`.

::public end

::private

The collection route delegates GET filtering/pagination and POST validation to
the bridge property service.

::private end

::end
*/
import { NextRequest } from 'next/server';
import { handleBridgePropertyCreate, handleBridgePropertySearch } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

/* ::neup.documentation::bridge-properties-get-handler
::function GET collection properties
::end */
const getHandler = async (req: NextRequest) => {
  try { return await handleBridgePropertySearch(req); }
  catch (err) {
    await logProblem(err, 'bridge/api.v1/properties:GET');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-properties-post-handler
::function POST create property
::end */
const postHandler = async (req: NextRequest) => {
  try { return await handleBridgePropertyCreate(req); }
  catch (err) {
    await logProblem(err, 'bridge/api.v1/properties:POST');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties:GET' }, getHandler);
export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties:POST' }, postHandler);
