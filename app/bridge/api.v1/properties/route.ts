/*
::neup.documentation::bridge-properties-collection
::api GET|POST /bridge/api.v1/properties

::public

GET returns active properties in a paginated response. It accepts `limit` and
`offset` (or `page`), plus `query` for term lookup, `agency` or `agent` for ownership
filtering, and `orderBy=newestFirst|oldestFirst` for creation/update order.
The limit defaults to 25 and is capped at 100; explicit offset takes precedence over page.
Additional property filters such as `location`, `purpose`, `category`,
`minPrice`, `maxPrice`, `minBedrooms`, and `maxBedrooms` are supported.
Use `include` to request optional fields. Defaults include title, purpose,
category, price, location, area, bedrooms, bathrooms, and images.

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
import { createProperty } from '@/services/properties/create';
import { listProperties } from '@/services/properties/list';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';
import { PropertyFiltersSchema } from '@/types';

export const dynamic = 'force-dynamic';

/* ::neup.documentation::bridge-properties-get-handler
::function GET collection properties
::end */
const getHandler = async (req: NextRequest) => {
  try {
    const q = req.nextUrl.searchParams;
    const number = (key: string, fallback: number) => { const value = Number(q.get(key)); return Number.isInteger(value) && value >= 0 ? value : fallback; };
    const split = (key: string) => q.get(key)?.split(',').map((value) => value.trim()).filter(Boolean);
    const value = (key: string) => q.get(key) || undefined;
    const parsed = PropertyFiltersSchema.omit({ status: true }).safeParse({ searchTerm: q.get('search') || q.get('q') || q.get('query') || undefined, id: value('id'), ids: split('ids'), minPrice: value('minPrice'), maxPrice: value('maxPrice'), location: value('location'), purpose: split('purpose'), category: split('category'), type: split('type'), minArea: value('minArea'), maxArea: value('maxArea'), agencyName: value('agencyName'), listingAgent: value('listingAgent'), isOwnerListing: q.get('isOwnerListing') === 'true' ? true : q.get('isOwnerListing') === 'false' ? false : undefined, postedAfter: value('postedAfter'), postedBefore: value('postedBefore'), minFloors: value('minFloors'), maxFloors: value('maxFloors'), minRoadAccess: value('minRoadAccess'), maxRoadAccess: value('maxRoadAccess'), bedrooms: value('bedrooms'), bathrooms: value('bathrooms'), listingBy: split('listingBy'), kitchens: value('kitchens'), diningRooms: value('diningRooms'), livingRooms: value('livingRooms'), carParkingSpots: value('carParkingSpots'), bikeParkingSpots: value('bikeParkingSpots'), tags: split('tags'), minBedrooms: value('minBedrooms'), maxBedrooms: value('maxBedrooms'), minBathrooms: value('minBathrooms'), maxBathrooms: value('maxBathrooms'), minKitchens: value('minKitchens'), maxKitchens: value('maxKitchens'), minDiningRooms: value('minDiningRooms'), maxDiningRooms: value('maxDiningRooms'), minLivingRooms: value('minLivingRooms'), maxLivingRooms: value('maxLivingRooms'), minCarParkingSpots: value('minCarParkingSpots'), maxCarParkingSpots: value('maxCarParkingSpots'), minBikeParkingSpots: value('minBikeParkingSpots'), maxBikeParkingSpots: value('maxBikeParkingSpots') });
    if (!parsed.success) return Response.json({ success: false, error: 'Invalid search filters.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const limit = Math.min(Math.max(number('limit', 25), 1), 100); const offset = q.has('offset') ? number('offset', 0) : (Math.max(number('page', 1), 1) - 1) * limit;
    const fields = (q.get('include') || q.get('fields'))?.split(',').map((value) => value.trim()).filter(Boolean);
    const result = await listProperties({ limit, offset, filters: parsed.data, agencyId: q.get('agency') || undefined, agentId: q.get('agent') || undefined, fields, orderBy: q.get('orderBy') === 'oldestFirst' ? 'oldestFirst' : 'newestFirst' });
    return Response.json({ success: true, properties: result.properties, totalCount: result.totalCount, limit, offset, page: Math.floor(offset / limit) + 1, totalPages: Math.ceil(result.totalCount / limit), appliedFilters: parsed.data }, { status: 200 });
  }
  catch (err) {
    await logProblem(err, 'bridge/api.v1/properties:GET');
    return Response.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

/* ::neup.documentation::bridge-properties-post-handler
::function POST create property
::end */
const postHandler = async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (value: unknown) => typeof value === 'string' ? value.trim() : undefined;
    const workingProfileId = text(body?.workingProfileId) || text(body?.workingProfile) || text(req.nextUrl.searchParams.get('workingProfile')) || text(req.headers.get('workingProfileId')) || text(req.headers.get('workingProfile'));
    const actorId = text(body?.accountId) || text(req.headers.get('accountId'));
    const postingAgencyId = text(body?.postingAgencyId) || text(req.headers.get('postingAgencyId')) || text(req.headers.get('agencyId'));
    const property = body?.property && typeof body.property === 'object' ? body.property : Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => !['accountId', 'workingProfileId', 'workingProfile', 'postingAgencyId'].includes(key)));
    if (!actorId) return Response.json({ success: false, error: 'Provide accountId in the request body or headers.' }, { status: 400 });
    const result = await createProperty(property, { actorAccountId: actorId, postingAgencyId: postingAgencyId ?? null, workingProfileId: workingProfileId ?? null });
    return Response.json({ success: true, requestId: result.requestId, status: 'awaiting review' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create property draft.';
    return Response.json({ success: false, error: message }, { status: message === 'Account not found.' ? 404 : 400 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties:GET' }, getHandler);
export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/properties:POST' }, postHandler);
