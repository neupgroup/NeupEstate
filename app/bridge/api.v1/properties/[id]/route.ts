/*
::neup.documentation::bridge-properties-item
::api GET|PATCH /bridge/api.v1/properties/[id]

::public

GET returns the detailed public payload for one approved property. The `id`
path parameter identifies the property. Optional `fields` may limit the
returned property fields.

PATCH submits an edit request for the property identified by `id`. The body
may include `accountId`, posting context fields, and a `property` or `data`
object. Edits are submitted for review and return a `requestId` and status.

::public end

::private

The item route supplies the path `id` to the bridge property view/edit
handlers; clients no longer need `/view` or `/edit` endpoints.

::private end

::end
*/
import { NextRequest } from 'next/server';
import { handleBridgePropertyEdit, handleBridgePropertyView } from '@/services/bridge-property-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/* ::neup.documentation::bridge-properties-id-get-handler
::function GET property details by id
::end */
const getHandler = async (req: NextRequest, context: Context) => {
  try { return await handleBridgePropertyView(req, (await context.params).id); }
  catch (err) {
    await logProblem(err, 'bridge/api.v1/properties/[id]:GET');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-properties-id-patch-handler
::function PATCH edit property by id
::end */
const patchHandler = async (req: NextRequest, context: Context) => {
  try { return await handleBridgePropertyEdit(req, (await context.params).id); }
  catch (err) {
    await logProblem(err, 'bridge/api.v1/properties/[id]:PATCH');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties/[id]:GET' }, getHandler);
export const PATCH = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties/[id]:PATCH' }, patchHandler);
