/*
::neup.documentation::bridge-properties-item
::api GET|PATCH /bridge/api.v1/properties/[id]

::public

GET returns the detailed public payload for one approved property. The `id`
path parameter identifies the property. Use `representatives.*` to return the
listing owner, agents, agency, and property owners. Select a subset with
`representatives.listingOwner`, `representatives.agents`,
`representatives.agent`, `representatives.agency`, or
`representatives.owners`. `representatives.agents` includes supporting agents
and includes the listing owner when that account is an agent;
`representatives.agent` includes only the listing owner when that account is an
agent. Representative entries include `id`, a `type`, and available names and
images. Agent entries also include a `role` identifying the listing owner or a
supporting agent. Example request:
`GET /bridge/api.v1/properties/property-id?include=representatives.*`.
Example response:
`{"success":true,"property":{"id":"property-id","representatives":[{"id":"account-id","type":"agent","role":"listingOwner","name":"Agent Name","image":"https://example.com/agent.jpg"},{"id":"supporting-account-id","type":"agent","role":"supportingAgent","name":"Supporting Agent","image":"https://example.com/supporting-agent.jpg"},{"id":"agency-id","type":"agency","name":"Agency Name","image":"https://example.com/logo.jpg"},{"id":"owner-id","type":"owner","name":"Property Owner","isPrimaryOwner":true}]}}`.

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
import { getPropertyAgentRepresentatives } from '@/services/properties/representatives/agents';
import { getPropertyAgencyRepresentative } from '@/services/properties/representatives/agencies';
import { getPropertyOwnerRepresentatives } from '@/services/properties/representatives/owners';
import { logger } from "@neup/logica/logger";

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

type PropertyRepresentativeSelection = {
  all: boolean;
  listingOwner: boolean;
  agents: boolean;
  agent: boolean;
  agency: boolean;
  owners: boolean;
};
const EMPTY_REPRESENTATIVE_SELECTION: PropertyRepresentativeSelection = {
  all: false,
  listingOwner: false,
  agents: false,
  agent: false,
  agency: false,
  owners: false,
};

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

function parsePropertyIncludes(value?: string | null): { fields?: string[]; representatives: PropertyRepresentativeSelection } {
  if (!value) return { representatives: EMPTY_REPRESENTATIVE_SELECTION };
  const propertyFields: string[] = [];
  const representatives = { ...EMPTY_REPRESENTATIVE_SELECTION };
  for (const selection of splitInclude(value)) {
    if (selection === 'representatives.*') {
      representatives.all = true;
      continue;
    }
    if (selection.startsWith('representatives.')) {
      const representative = selection.slice('representatives.'.length) as Exclude<keyof PropertyRepresentativeSelection, 'all'>;
      if (!['listingOwner', 'agents', 'agent', 'agency', 'owners'].includes(representative)) {
        throw new Error(`Unsupported representative selection: ${representative}`);
      }
      representatives[representative] = true;
      continue;
    }
    if (/^(agent|agents|listingAgent|supportingAgents|agency)(?:\.|\(|$)/.test(selection)) {
      throw new Error(`Legacy include '${selection.split(/[.(]/, 1)[0]}' is no longer supported. Use representatives.*.`);
    }
    const match = /^([A-Za-z][A-Za-z0-9_.]*)(?:\((.*)\))?$/.exec(selection);
    if (!match) throw new Error(`Invalid include selection: ${selection}`);
    const [, field, nested] = match;
    if (nested !== undefined) throw new Error(`Nested includes are not supported for ${field}.`);
    propertyFields.push(field);
  }
  return { fields: propertyFields.length ? propertyFields : undefined, representatives };
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
    const fields = [...new Set([
      ...(includes.fields ?? []),
      ...(includes.representatives.all || includes.representatives.owners ? ['owners'] : []),
    ])];
    const property = await getProperty({ propertyId, propertyCode, fields });
    if (!property) return Response.json({ success: false, error: 'Property not found.' }, { status: 404 });
    const supportingAgentIds = (property.details as any)?.supportingAgents ?? [];
    const propertyFields = { ...property };
    delete propertyFields.agent;
    delete propertyFields.listingAgent;
    delete propertyFields.listingAgentId;
    delete propertyFields.listingAgentImage;
    delete propertyFields.supportingAgents;
    delete propertyFields.agency;
    delete propertyFields.owner;
    delete propertyFields.owners;
    const { representatives: representativeSelection } = includes;
    const [agentRepresentatives, agencyRepresentatives, ownerRepresentatives] = await Promise.all([
      getPropertyAgentRepresentatives({
        propertyId: property.id ?? routeId,
        listingOwnerId: typeof property.listingAgentId === 'string' ? property.listingAgentId : null,
        supportingAgentIds: Array.isArray(supportingAgentIds) ? supportingAgentIds : [],
        includeListingOwner: representativeSelection.all || representativeSelection.listingOwner,
        includeAgents: representativeSelection.all || representativeSelection.agents || representativeSelection.agent,
        includeSupportingAgents: representativeSelection.all || representativeSelection.agents,
      }),
      representativeSelection.all || representativeSelection.agency
        ? getPropertyAgencyRepresentative(property.id)
        : Promise.resolve([]),
      representativeSelection.all || representativeSelection.owners
        ? Promise.resolve(getPropertyOwnerRepresentatives(Array.isArray(property.owners) ? property.owners : []))
        : Promise.resolve([]),
    ]);
    const responseProperty = {
      ...propertyFields,
      representatives: [...agentRepresentatives, ...agencyRepresentatives, ...ownerRepresentatives],
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
