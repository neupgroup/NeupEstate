/*
::neup.documentation::bridge-properties-collection
::api GET|POST /bridge/api.v1/properties

::public

GET returns a paginated response. Use the optional comma-separated `status`
parameter to return only matching statuses, for example
`?status=drafts,pending,rejected,active`. Supported values are `drafts`,
`pending`, `rejected`, `active`, `sold`, `rented`, `archived`,
`awaiting_creation`, and `awaiting_deletion`; `draft` and `approved` are also
accepted aliases. If omitted, the endpoint returns only `active` properties.
Each property includes all supported fields, including `status`.

It accepts `limit` and `offset`, plus `query` for term lookup,
`agency` or `agent` for ownership filtering, and `orderBy=newestFirst|oldestFirst`
for creation/update order.
Text searches run literal term matching alongside Nia filter parsing, merge the
two result sets without duplicate properties, and keep literal results if Nia
is unavailable.
The limit defaults to 15 and is capped at 100; offset defaults to 0. This API uses only `limit` and `offset` for pagination.
Additional property filters such as `location`, `purpose`, `category`,
`minPrice`, `maxPrice`, `minBedrooms`, and `maxBedrooms` are supported.
All supported property fields are returned by default, including `status`.
`include` (or `fields`) may be used to select a subset of those fields.

Example request: `GET /bridge/api.v1/properties` returns active properties by default with `limit` 15 and `offset` 0. `GET /bridge/api.v1/properties?status=rejected&limit=15` returns rejected properties only.
Example response for `status=rejected`: `{"success":true,"properties":[{"id":"property-id","status":"REJECTED"}],"totalCount":1,"limit":15,"offset":0,"appliedFilters":{"status":["rejected"]}}`.

GET response fields include `success`, `properties`, `totalCount`, `offset`,
`limit`, and `appliedFilters`.

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
import { submitPropertyCreation } from '@/services/properties/create';
import { listProperties } from '@/services/properties/list';
import { searchProperties } from '@/services/properties/search';
import { logger } from "@neup/logica/logger";
import { PropertyFiltersSchema } from '@/types';

export const dynamic = 'force-dynamic';

// Read a non-negative integer query parameter, using its default when absent or invalid.
function readNonNegativeInteger(params: URLSearchParams, key: string, fallback: number): number {
  const parameter = params.get(key);
  if (parameter === null || parameter.trim() === '') return fallback;

  const value = Number(parameter);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

// Read a comma-separated query parameter as trimmed non-empty values.
function readListParameter(params: URLSearchParams, key: string): string[] | undefined {
  const value = params.get(key);
  return value?.split(',').map((item) => item.trim()).filter(Boolean);
}

// Read a query parameter as undefined when it is missing or empty.
function readOptionalParameter(params: URLSearchParams, key: string): string | undefined {
  return params.get(key) || undefined;
}

// Convert supported property filter query parameters into the schema input object.
function buildPropertyFilterInput(params: URLSearchParams): Record<string, unknown> {
  return {
    searchTerm: params.get('search') || params.get('q') || params.get('query') || undefined,
    id: readOptionalParameter(params, 'id'),
    ids: readListParameter(params, 'ids'),
    minPrice: readOptionalParameter(params, 'minPrice'),
    maxPrice: readOptionalParameter(params, 'maxPrice'),
    location: readOptionalParameter(params, 'location'),
    purpose: readListParameter(params, 'purpose'),
    category: readListParameter(params, 'category'),
    type: readListParameter(params, 'type'),
    minArea: readOptionalParameter(params, 'minArea'),
    maxArea: readOptionalParameter(params, 'maxArea'),
    agencyName: readOptionalParameter(params, 'agencyName'),
    listingAgent: readOptionalParameter(params, 'listingAgent'),
    isOwnerListing: params.get('isOwnerListing') === 'true'
      ? true
      : params.get('isOwnerListing') === 'false'
        ? false
        : undefined,
    postedAfter: readOptionalParameter(params, 'postedAfter'),
    postedBefore: readOptionalParameter(params, 'postedBefore'),
    minFloors: readOptionalParameter(params, 'minFloors'),
    maxFloors: readOptionalParameter(params, 'maxFloors'),
    minRoadAccess: readOptionalParameter(params, 'minRoadAccess'),
    maxRoadAccess: readOptionalParameter(params, 'maxRoadAccess'),
    bedrooms: readOptionalParameter(params, 'bedrooms'),
    bathrooms: readOptionalParameter(params, 'bathrooms'),
    listingBy: readListParameter(params, 'listingBy'),
    kitchens: readOptionalParameter(params, 'kitchens'),
    diningRooms: readOptionalParameter(params, 'diningRooms'),
    livingRooms: readOptionalParameter(params, 'livingRooms'),
    carParkingSpots: readOptionalParameter(params, 'carParkingSpots'),
    bikeParkingSpots: readOptionalParameter(params, 'bikeParkingSpots'),
    tags: readListParameter(params, 'tags'),
    minBedrooms: readOptionalParameter(params, 'minBedrooms'),
    maxBedrooms: readOptionalParameter(params, 'maxBedrooms'),
    minBathrooms: readOptionalParameter(params, 'minBathrooms'),
    maxBathrooms: readOptionalParameter(params, 'maxBathrooms'),
    minKitchens: readOptionalParameter(params, 'minKitchens'),
    maxKitchens: readOptionalParameter(params, 'maxKitchens'),
    minDiningRooms: readOptionalParameter(params, 'minDiningRooms'),
    maxDiningRooms: readOptionalParameter(params, 'maxDiningRooms'),
    minLivingRooms: readOptionalParameter(params, 'minLivingRooms'),
    maxLivingRooms: readOptionalParameter(params, 'maxLivingRooms'),
    minCarParkingSpots: readOptionalParameter(params, 'minCarParkingSpots'),
    maxCarParkingSpots: readOptionalParameter(params, 'maxCarParkingSpots'),
    minBikeParkingSpots: readOptionalParameter(params, 'minBikeParkingSpots'),
  };
}

// Resolve property ordering while defaulting to newest listings first.
function readPropertyOrder(params: URLSearchParams): 'newestFirst' | 'oldestFirst' {
  return params.get('orderBy') === 'oldestFirst' ? 'oldestFirst' : 'newestFirst';
}

// Parse the requested property field list from include or its fields alias.
function readPropertyFields(params: URLSearchParams): string[] | undefined {
  const selection = params.get('include') || params.get('fields');
  return selection?.split(',').map((field) => field.trim()).filter(Boolean);
}

// Normalize optional text values from property submission input.
function readTrimmedText(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

// Resolve the acting account from the request body or account header.
function readActorAccountId(body: Record<string, unknown>, request: NextRequest): string | undefined {
  return readTrimmedText(body.accountId) || readTrimmedText(request.headers.get('accountId'));
}

// Resolve the posting agency from supported request fields and headers.
function readPostingAgencyId(body: Record<string, unknown>, request: NextRequest): string | undefined {
  return readTrimmedText(body.postingAgencyId)
    || readTrimmedText(request.headers.get('postingAgencyId'))
    || readTrimmedText(request.headers.get('agencyId'));
}

// Resolve the active working profile from body, query, or supported headers.
function readWorkingProfileId(body: Record<string, unknown>, request: NextRequest): string | undefined {
  return readTrimmedText(body.workingProfileId)
    || readTrimmedText(body.workingProfile)
    || readTrimmedText(request.nextUrl.searchParams.get('workingProfile'))
    || readTrimmedText(request.headers.get('workingProfileId'))
    || readTrimmedText(request.headers.get('workingProfile'));
}

// Accept either a nested property object or top-level property fields.
function readPropertySubmission(body: Record<string, unknown>): Record<string, unknown> {
  if (body.property && typeof body.property === 'object' && !Array.isArray(body.property)) {
    return body.property as Record<string, unknown>;
  }

  const requestMetadata = ['accountId', 'workingProfileId', 'workingProfile', 'postingAgencyId'];
  return Object.fromEntries(Object.entries(body).filter(([key]) => !requestMetadata.includes(key)));
}

/* ::neup.documentation::bridge-properties-get-handler
::function GET collection properties
::end */
const getHandler = async (req: NextRequest) => {
  try {
    const q = req.nextUrl.searchParams;
    const requestedStatuses = q.has('status') ? q.get('status')!.split(',').map((status) => status.trim().toLowerCase()) : undefined;
    const allowedStatuses = new Set(['draft', 'drafts', 'pending', 'rejected', 'approved', 'active', 'sold', 'rented', 'archived', 'awaiting_creation', 'awaiting_deletion']);
    if (requestedStatuses && (!requestedStatuses.length || requestedStatuses.some((status) => !status || !allowedStatuses.has(status)))) {
      return Response.json({ success: false, error: 'Invalid status filter.', allowedStatuses: [...allowedStatuses] }, { status: 400 });
    }
    const statuses = requestedStatuses ?? ['active'];
    const parsed = PropertyFiltersSchema.omit({ status: true }).safeParse(buildPropertyFilterInput(q));
    if (!parsed.success) return Response.json({ success: false, error: 'Invalid search filters.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    // Clamp the requested page size to the supported inclusive range of 1–100.
    const limit = Math.min(Math.max(readNonNegativeInteger(q, 'limit', 15), 1), 100);
    const offset = readNonNegativeInteger(q, 'offset', 0);
    // Parse requested property fields from the include or fields parameter.
    const fields = readPropertyFields(q);
    const searchTerm = q.get('search') || q.get('q') || q.get('query');
    const agencyId = readOptionalParameter(q, 'agency');
    const agentId = readOptionalParameter(q, 'agent');

    if (searchTerm) {
      const result = await searchProperties({
        ...parsed.data,
        q: searchTerm,
        offset,
        limit,
        statuses,
        orderBy: readPropertyOrder(q),
        agencyId,
        agentId,
      });
      if (!result.success || !result.data) {
        return Response.json({ success: false, error: result.error || 'Property search failed.' }, { status: 500 });
      }

      let properties: unknown[] = result.data.properties;
      if (fields?.length) {
        const propertyIds = result.data.properties.map((property) => property.id);
        const projected = await listProperties({
          // Keep the projection query valid when the initial search returns no IDs.
          limit: Math.max(propertyIds.length, 1),
          offset: 0,
          filters: { ids: propertyIds },
          statuses,
          agencyId,
          agentId,
          fields: [...new Set([...fields, 'id'])],
          orderBy: readPropertyOrder(q),
        });
        const projectedById = new Map(projected.properties.map((property) => [String(property.id), property]));
        properties = propertyIds.flatMap((propertyId) => {
          const property = projectedById.get(propertyId);
          if (!property) return [];
          if (!fields.includes('id')) delete property.id;
          return [property];
        });
      }

      return Response.json({
        success: true,
        properties,
        totalCount: result.data.totalCount,
        limit,
        offset,
        appliedFilters: { ...result.data.appliedFilters, status: statuses },
      }, { status: 200 });
    }

    const result = await listProperties({
      limit,
      offset,
      filters: parsed.data,
      statuses,
      agencyId,
      agentId,
      fields,
      orderBy: readPropertyOrder(q),
    });
    return Response.json({
      success: true,
      properties: result.properties,
      totalCount: result.totalCount,
      limit,
      offset,
      appliedFilters: { ...parsed.data, status: statuses },
    }, { status: 200 });
  }
  catch (err) {
    await logger().type('bridge/api.v1/properties:GET').data({ error: String(err), details: {} }).log();
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-properties-post-handler
::function POST create property
::end */
const postHandler = async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const requestBody = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const workingProfileId = readWorkingProfileId(requestBody, req);
    const actorId = readActorAccountId(requestBody, req);
    const postingAgencyId = readPostingAgencyId(requestBody, req);
    const property = readPropertySubmission(requestBody);
    if (!actorId) return Response.json({ success: false, error: 'Provide accountId in the request body or headers.' }, { status: 400 });
    const result = await submitPropertyCreation(property, {
      actorAccountId: actorId,
      postingAgencyId: postingAgencyId ?? null,
      workingProfileId: workingProfileId ?? null,
    });
    return Response.json({ success: true, requestId: result.requestId, status: 'awaiting review' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create property draft.';
    return Response.json({ success: false, error: message }, { status: message === 'Account not found.' ? 404 : 400 });
  }
};

export const GET = getHandler;
export const POST = postHandler;
