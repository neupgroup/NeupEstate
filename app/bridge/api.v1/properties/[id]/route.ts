/*
::neup.documentation::bridge-properties-item
::api GET|PATCH /bridge/api.v1/properties/[id]

::public

GET returns the detailed public payload for one approved property. The `id`
path parameter identifies the property. Optional `include` may select additional
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
import { getProperty } from '@/services/properties/single/get';
import { updateProperty } from '@/services/properties/single/update';
import { deleteProperty } from '@/services/properties/single/delete';
import { logger } from "@neup/logica/logger";

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

/* ::neup.documentation::bridge-properties-id-get-handler
::function GET property details by id
::end */
const getHandler = async (req: NextRequest, context: Context) => {
  try {
    const routeId = (await context.params).id?.trim();
    const propertyId = routeId || req.nextUrl.searchParams.get('propertyId')?.trim() || req.headers.get('propertyId')?.trim();
    const propertyCode = req.nextUrl.searchParams.get('propertyCode')?.trim() || req.nextUrl.searchParams.get('property_code')?.trim() || req.nextUrl.searchParams.get('customId')?.trim() || req.headers.get('propertyCode')?.trim() || req.headers.get('property_code')?.trim() || req.headers.get('customId')?.trim();
    const fields = (req.nextUrl.searchParams.get('include') || req.nextUrl.searchParams.get('fields'))?.split(',').map((value) => value.trim()).filter(Boolean);
    const property = await getProperty({ propertyId, propertyCode, fields });
    return property ? Response.json({ success: true, property }) : Response.json({ success: false, error: 'Property not found.' }, { status: 404 });
  }
  catch (err) {
    await logger().type('bridge/api.v1/properties/[id]:GET').data({ error: String(err), details: {} }).log();
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-properties-id-patch-handler
::function PATCH edit property by id
::end */
const patchHandler = async (req: NextRequest, context: Context) => {
  try {
    const body = await req.json().catch(() => ({})); const propertyId = (await context.params).id;
    const accountId = typeof body?.accountId === 'string' ? body.accountId.trim() : req.headers.get('accountId')?.trim();
    const data = body?.property && typeof body.property === 'object' ? body.property : body?.data && typeof body.data === 'object' ? body.data : body;
    if (!accountId) return Response.json({ success: false, error: 'Provide accountId in the request body or headers.' }, { status: 400 });
    const result = await updateProperty({ propertyId, accountId, data });
    return Response.json({ success: true, requestId: result.requestId, status: 'awaiting review' });
  }
  catch (err) {
    await logger().type('bridge/api.v1/properties/[id]:PATCH').data({ error: String(err), details: {} }).log();
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = getHandler;
export const PATCH = patchHandler;

const deleteHandler = async (req: NextRequest, context: Context) => {
  try {
    const body = await req.json().catch(() => ({}));
    const actorAccountId = typeof body?.accountId === 'string'
      ? body.accountId.trim()
      : req.nextUrl.searchParams.get('accountId')?.trim() || req.headers.get('accountId')?.trim();
    if (!actorAccountId) return Response.json({ success: false, error: 'Provide accountId in the request body, query, or headers.' }, { status: 400 });
    await deleteProperty({ propertyId: (await context.params).id }, { actorAccountId });
    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    await logger().type('bridge/api.v1/properties/[id]:DELETE').data({ error: String(err), details: {} }).log();
    return Response.json({ success: false, error: 'Failed to delete property.' }, { status: 500 });
  }
};

export const DELETE = deleteHandler;
