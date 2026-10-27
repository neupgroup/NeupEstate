/*
::neup.documentation::bridge-properties-item
::api GET|PATCH /bridge/api.v1/properties/[id]

::public

GET returns the detailed public payload for one approved property. The `id`
path parameter identifies the property. `property.listingAgent` is an array
containing the listing owner, and `property.supportingAgents` is an array of
supporting agents. Agent and agency objects always include `id`. Select fields
with nested includes:
`?include=agents(id,name,image),agency(name,image)` selects both agent arrays;
`?include=agent(id,name,image)` is an alias for the listing agent and returns
that data under `listingAgent`;
`?include=listingAgent` selects only the listing agent ID, and
`?include=supportingAgents` selects only supporting agent IDs. `agents(*)`
selects all documented fields for both agent arrays. If `include` is omitted,
both agent arrays are returned with `id` only.
For agents, `displayName` is an alias for `name` and `displayImage` is an alias
for `image`; responses always use the output keys `name` and `image`.
Example response:
`{"success":true,"property":{"id":"property-id","listingAgent":[{"id":"account-id","name":"Agent Name","image":"https://example.com/agent.jpg"}],"supportingAgents":[{"id":"supporting-account-id","name":"Supporting Agent","image":"https://example.com/supporting-agent.jpg"}],"agency":{"id":"agency-id","name":"Agency Name","image":"https://example.com/logo.jpg"}}}`.

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
import { getMainAgent, getPropertyAgency, getSupportingAgents } from '@/services/properties/agents';
import { logger } from "@neup/logica/logger";

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const AGENT_FIELDS = ['id', 'name', 'image'] as const;
const AGENT_FIELD_ALIASES = ['displayName', 'displayImage'] as const;

function splitInclude(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth < 0) throw new Error('Malformed include expression.');
    } else if (character === ',' && depth === 0) {
      const part = value.slice(start, index).trim();
      if (!part) throw new Error('Malformed include expression.');
      parts.push(part);
      start = index + 1;
    }
  }
  if (depth !== 0) throw new Error('Malformed include expression.');
  const tail = value.slice(start).trim();
  if (!tail) throw new Error('Malformed include expression.');
  parts.push(tail);
  return parts;
}

function parsePropertyIncludes(value?: string | null): { fields?: string[]; listingAgent?: string[]; supportingAgents?: string[]; agency?: string[] } {
  if (!value) return { listingAgent: ['id'], supportingAgents: ['id'] };
  const propertyFields: string[] = [];
  let listingAgent: string[] | undefined;
  let supportingAgents: string[] | undefined;
  let agency: string[] | undefined;
  let agentSelectionProvided = false;
  for (const selection of splitInclude(value)) {
    const match = /^([A-Za-z][A-Za-z0-9_.]*)(?:\((.*)\))?$/.exec(selection);
    if (!match) throw new Error(`Invalid include selection: ${selection}`);
    const [, field, nested] = match;
    if (field === 'agents' || field === 'agent' || field === 'listingAgent' || field === 'supportingAgents' || field === 'agency') {
      if (field !== 'agency') agentSelectionProvided = true;
      const selectedFields = nested === undefined ? [] : nested === '*'
        ? [...AGENT_FIELDS]
        : splitInclude(nested);
      if (selectedFields.some((name) =>
        !AGENT_FIELDS.includes(name as typeof AGENT_FIELDS[number]) &&
        !AGENT_FIELD_ALIASES.includes(name as typeof AGENT_FIELD_ALIASES[number])
      )) {
        throw new Error(`Unsupported ${field} include field.`);
      }
      const normalized = [...new Set(['id', ...selectedFields])];
      if (field === 'agents') {
        listingAgent = [...new Set([...(listingAgent ?? []), ...normalized])];
        supportingAgents = [...new Set([...(supportingAgents ?? []), ...normalized])];
      } else if (field === 'agent' || field === 'listingAgent') listingAgent = [...new Set([...(listingAgent ?? []), ...normalized])];
      else if (field === 'supportingAgents') supportingAgents = [...new Set([...(supportingAgents ?? []), ...normalized])];
      else agency = [...new Set([...(agency ?? []), ...normalized])];
      continue;
    }
    if (nested !== undefined) throw new Error(`Nested includes are not supported for ${field}.`);
    propertyFields.push(field);
  }
  if (!agentSelectionProvided) {
    listingAgent = ['id'];
    supportingAgents = ['id'];
  }
  return { fields: propertyFields.length ? propertyFields : undefined, listingAgent, supportingAgents, agency };
}

/* ::neup.documentation::bridge-properties-id-get-handler
::function GET property details by id
::end */
const getHandler = async (req: NextRequest, context: Context) => {
  try {
    const routeId = (await context.params).id?.trim();
    const propertyId = routeId || req.nextUrl.searchParams.get('propertyId')?.trim() || req.headers.get('propertyId')?.trim();
    const propertyCode = req.nextUrl.searchParams.get('propertyCode')?.trim() || req.nextUrl.searchParams.get('property_code')?.trim() || req.nextUrl.searchParams.get('customId')?.trim() || req.headers.get('propertyCode')?.trim() || req.headers.get('property_code')?.trim() || req.headers.get('customId')?.trim();
    const includeParam = req.nextUrl.searchParams.get('include') ?? req.nextUrl.searchParams.get('fields');
    let includes: ReturnType<typeof parsePropertyIncludes>;
    try {
      includes = parsePropertyIncludes(includeParam);
    } catch (error) {
      return Response.json({ success: false, error: error instanceof Error ? error.message : 'Invalid include expression.' }, { status: 400 });
    }
    const fields = includes.fields;
    const property = await getProperty({ propertyId, propertyCode, fields });
    if (!property) return Response.json({ success: false, error: 'Property not found.' }, { status: 404 });
    const supportingAgentIds = (property.details as any)?.supportingAgents ?? [];
    const propertyFields = { ...property };
    delete propertyFields.agent;
    delete propertyFields.listingAgent;
    delete propertyFields.listingAgentId;
    delete propertyFields.listingAgentImage;
    const responseProperty = {
      ...propertyFields,
      ...(includes.listingAgent ? {
        listingAgent: await getMainAgent(typeof property.listingAgentId === 'string' ? property.listingAgentId : null, includes.listingAgent),
      } : {}),
      ...(includes.supportingAgents ? {
        supportingAgents: await getSupportingAgents(Array.isArray(supportingAgentIds) ? supportingAgentIds : [], includes.supportingAgents),
      } : {}),
      ...(includes.agency ? { agency: await getPropertyAgency(typeof property.agency?.id === 'string' ? property.agency.id : null, includes.agency) } : {}),
    };
    return Response.json({ success: true, property: responseProperty });
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
