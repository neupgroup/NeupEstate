/*
::neup.documentation::bridge-listings-collection
::api GET|POST /bridge/api.v1/listings

::public

GET returns a paginated response. Use the optional comma-separated `status`
parameter to return only matching statuses, for example
`?status=drafts,pending,rejected,active`. Supported values are `drafts`,
`pending`, `rejected`, `active`, `sold`, `rented`, `archived`,
`awaiting_creation`, and `awaiting_deletion`; `draft` and `approved` are also
accepted aliases. If omitted, the endpoint returns only `active` properties.
Each property includes all supported fields, including `status`. Its single
primary price is returned as `price: { currency, basis, amount }`.

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

Example request: `GET /bridge/api.v1/listings` returns active properties by default with `limit` 15 and `offset` 0. `GET /bridge/api.v1/listings?status=rejected&limit=15` returns rejected properties only.
Example response for `status=rejected`: `{"success":true,"listings":[{"slug":"modern-home--property-id","status":"REJECTED"}],"totalCount":1,"limit":15,"offset":0,"appliedFilters":{"status":["rejected"]}}`. Use that `slug` value for a listing detail, update, delete, save, or inquiry request.

GET response fields include `success`, `listings`, `totalCount`, `offset`,
`limit`, and `appliedFilters`.

POST is the guided listing creation API. The first request initializes a
creation ID. Later requests pass that ID and incremental listing fields; the
response returns typed `required` descriptors and `requiredKeys`. The actor
is resolved from a verified `x-auth` token or `auth` cookie.

::public end

::private

The collection route handles GET listing search and POST listing creation.

::private end

::end
*/
import { NextRequest } from 'next/server';
import { addListingCreationInfo, getListingCreationRequirements, initializeListingCreation } from '@/services/listings/create';
import { prisma } from '@neup/core/database/prisma';
import { getAuthenticatedAccount } from '@/services/auth/account';
import { listListings } from '@/services/listings/list';
import { searchListings } from '@/services/listings/search';
import { ListingFiltersSchema } from '@/types';
import { getListingSlugId } from '@/services/listings/slug';

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
function buildListingFilterInput(params: URLSearchParams): Record<string, unknown> {
  return {
    searchTerm: params.get('search') || params.get('q') || params.get('query') || undefined,
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
function readListingOrder(params: URLSearchParams): 'newestFirst' | 'oldestFirst' {
  return params.get('orderBy') === 'oldestFirst' ? 'oldestFirst' : 'newestFirst';
}

// Parse the requested property field list from include or its fields alias.
function readListingFields(params: URLSearchParams): string[] | undefined {
  const selection = params.get('include') || params.get('fields');
  return selection?.split(',').map((field) => field.trim()).filter(Boolean);
}

// Normalize optional text values from property submission input.
function readTrimmedText(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

// Replace the internal listing key with the canonical public listing identifier.
function toPublicListing(listing: Record<string, unknown>): Record<string, unknown> {
  const id = typeof listing.id === 'string' ? listing.id : '';
  const slug = typeof listing.slug === 'string' ? listing.slug : null;
  const { id: _id, ...publicListing } = listing;
  return { ...publicListing, slug: id ? getListingSlugId({ id, slug }) : slug };
}

// Resolve the active working profile from body, query, or supported headers.
function readWorkingProfileId(body: Record<string, unknown>, request: NextRequest): string | undefined {
  return readTrimmedText(body.workingProfileId)
    || readTrimmedText(body.workingProfile)
    || readTrimmedText(request.nextUrl.searchParams.get('workingProfile'))
    || readTrimmedText(request.headers.get('workingProfileId'))
    || readTrimmedText(request.headers.get('workingProfile'));
}

// Collect incremental listing values from URL parameters, preserving simple array inputs.
function readCreationQueryPatch(params: URLSearchParams): Record<string, unknown> {
  const metadata = new Set(['mode', 'id', 'creation', 'accountId', 'workingProfileId', 'workingProfile', 'postingAgencyId']);
  const patch: Record<string, unknown> = {};
  params.forEach((value, key) => {
    if (!metadata.has(key)) patch[key] = ['types', 'images'].includes(key)
      ? value.split(',').map((item) => item.trim()).filter(Boolean)
      : value;
  });
  return patch;
}

/* ::neup.documentation::bridge-listings-get-handler
::function GET collection properties
::end */
const getHandler = async (req: NextRequest) => {
  try {
    const q = req.nextUrl.searchParams;
    const requestedStatuses = q.has('status') ? q.get('status')!.split(',').map((status) => status.trim().toLowerCase()) : undefined;
    if (q.has('id') || q.has('ids')) return Response.json({ success: false, error: 'Listing IDs are not accepted. Address a listing by its canonical slug--id value.' }, { status: 400 });
    const allowedStatuses = new Set(['draft', 'drafts', 'pending', 'rejected', 'approved', 'active', 'sold', 'rented', 'archived', 'awaiting_creation', 'awaiting_deletion']);
    if (requestedStatuses && (!requestedStatuses.length || requestedStatuses.some((status) => !status || !allowedStatuses.has(status)))) {
      return Response.json({ success: false, error: 'Invalid status filter.', allowedStatuses: [...allowedStatuses] }, { status: 400 });
    }
    const statuses = requestedStatuses ?? ['active'];
    const parsed = ListingFiltersSchema.omit({ status: true }).safeParse(buildListingFilterInput(q));
    if (!parsed.success) return Response.json({ success: false, error: 'Invalid search filters.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    // Clamp the requested page size to the supported inclusive range of 1–100.
    const limit = Math.min(Math.max(readNonNegativeInteger(q, 'limit', 15), 1), 100);
    const offset = readNonNegativeInteger(q, 'offset', 0);
    // Parse requested property fields from the include or fields parameter.
    const fields = readListingFields(q);
    const searchTerm = q.get('search') || q.get('q') || q.get('query');
    const agencyId = readOptionalParameter(q, 'agency');
    const agentId = readOptionalParameter(q, 'agent');

    if (searchTerm) {
      const result = await searchListings({
        ...parsed.data,
        q: searchTerm,
        offset,
        limit,
        statuses,
        orderBy: readListingOrder(q),
        agencyId,
        agentId,
      });
      if (!result.success || !result.data) {
        return Response.json({ success: false, error: result.error || 'Property search failed.' }, { status: 500 });
      }

      let listings: unknown[] = result.data.listings;
      if (fields?.length) {
        const propertyIds = result.data.listings.map((property) => property.id);
        const projected = await listListings({
          // Keep the projection query valid when the initial search returns no IDs.
          limit: Math.max(propertyIds.length, 1),
          offset: 0,
          filters: { ids: propertyIds },
          statuses,
          agencyId,
          agentId,
          fields: [...new Set([...fields, 'id'])],
          orderBy: readListingOrder(q),
        });
        const projectedById = new Map(projected.listings.map((property) => [String(property.id), property]));
        listings = propertyIds.flatMap((propertyId) => {
          const property = projectedById.get(propertyId);
          if (!property) return [];
          if (!fields.includes('id')) delete property.id;
          return [property];
        });
      }

      return Response.json({
        success: true,
        listings: listings.map((listing) => toPublicListing(listing as Record<string, unknown>)),
        totalCount: result.data.totalCount,
        limit,
        offset,
        appliedFilters: { ...result.data.appliedFilters, status: statuses },
      }, { status: 200 });
    }

    const result = await listListings({
      limit,
      offset,
      filters: parsed.data,
      statuses,
      agencyId,
      agentId,
      fields,
      orderBy: readListingOrder(q),
    });
    return Response.json({
      success: true,
      listings: result.listings.map((listing) => toPublicListing(listing)),
      totalCount: result.totalCount,
      limit,
      offset,
      appliedFilters: { ...parsed.data, status: statuses },
    }, { status: 200 });
  }
  catch (err) {
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-listings-post-handler
::function POST create property
::end */
const postHandler = async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const requestBody = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const workingProfileId = readWorkingProfileId(requestBody, req);
    const hasAuthCredential = Boolean(req.headers.get('x-auth')?.trim() || req.cookies.get('auth')?.value);
    if (!hasAuthCredential) return Response.json({ success: false, error: { code: 'unauthenticated', description: 'Provide a valid x-auth token or auth cookie.' } }, { status: 401 });
    const authResult = await getAuthenticatedAccount();
    if (!authResult.success || !authResult.account.aid.trim()) {
      return Response.json({ success: false, error: { code: 'unauthenticated', description: 'The x-auth token or auth cookie is invalid or expired.' } }, { status: 401 });
    }
    const actorId = authResult.account.aid;

    const creationId = readTrimmedText(requestBody.id)
      ?? readTrimmedText(requestBody.creationId)
      ?? readTrimmedText(req.nextUrl.searchParams.get('id'))
      ?? readTrimmedText(req.nextUrl.searchParams.get('creation'));
    if (!creationId) {
      const initialized = await initializeListingCreation({ actorAccountId: actorId, workingProfileId });
      return Response.json({ success: true, response: { ...initialized, requiredKeys: initialized.required.map(({ key }) => key) } }, { status: 201 });
    }

    const patchValue = requestBody.data && typeof requestBody.data === 'object' && !Array.isArray(requestBody.data)
      ? requestBody.data as Record<string, unknown>
      : requestBody.listing && typeof requestBody.listing === 'object' && !Array.isArray(requestBody.listing)
        ? requestBody.listing as Record<string, unknown>
        : requestBody;
    const bodyPatch = Object.fromEntries(Object.entries(patchValue).filter(([key]) => ![
      'mode', 'id', 'creation', 'creationId', 'accountId', 'workingProfileId', 'postingAgencyId', 'data', 'listing',
    ].includes(key)));
    const patch = { ...readCreationQueryPatch(req.nextUrl.searchParams), ...bodyPatch };
    if (Object.keys(patch).length) {
      const updated = await addListingCreationInfo({ creationId, actorAccountId: actorId, patch });
      return Response.json({ success: true, response: { ...updated, requiredKeys: updated.required.map(({ key }) => key) } });
    }

    const record = await prisma.listingChange.findFirst({
      where: { id: creationId, accountId: actorId, status: { in: ['creation_draft', 'creation_pending'] }, isApproved: null },
      select: { id: true, status: true, data: true },
    });
    if (!record) return Response.json({ success: false, error: { code: 'creation_not_found', description: 'Creation request not found or unavailable.' } }, { status: 404 });
    const stored = record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as Record<string, unknown> : {};
    const data = stored._guidedFormData && typeof stored._guidedFormData === 'object' && !Array.isArray(stored._guidedFormData)
      ? stored._guidedFormData as Record<string, unknown>
      : stored;
    const complete = record.status === 'creation_pending';
    const required = complete ? [] : getListingCreationRequirements(data);
    const response = {
      creationId: record.id,
      stage: complete ? 'ready_for_review' : data.stage ?? 'initialized',
      type: typeof data.category === 'string' ? data.category : null,
      purpose: typeof data.purpose === 'string' ? data.purpose : null,
      required,
      requiredKeys: required.map(({ key }) => key),
      complete,
    };
    return Response.json({ success: true, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create property draft.';
    const details = (error as { details?: unknown })?.details;
    return Response.json({ success: false, error: { code: 'listing_creation_failed', description: message, ...(details ? { details } : {}) } }, { status: message.includes('not found') ? 404 : 400 });
  }
};

export const GET = getHandler;
export const POST = postHandler;
