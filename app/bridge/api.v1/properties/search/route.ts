/*
::neup.documentation::bridge-properties-search
::api GET|POST /bridge/api.v1/properties/search
::public

Searches properties using text and/or structured filters. GET reads search
parameters from the URL. POST reads filters, pagination, and ordering from a
JSON body and rejects search parameters in the URL. Use POST when the encoded
GET URL would exceed 2,000 bytes.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@neup/logica/logger';
import { PropertyFiltersSchema } from '@/types';
import { searchProperties } from '@/services/properties/search';

export const dynamic = 'force-dynamic';

const SEARCH_PARAMETERS = new Set([
  'q', 'query', 'search', 'searchTerm', 'search_term', 'id', 'ids', 'status', 'statuses',
  'minPrice', 'maxPrice', 'location', 'purpose', 'category', 'type', 'minArea', 'maxArea',
  'agencyName', 'listingAgent', 'isOwnerListing', 'postedAfter', 'postedBefore', 'minFloors',
  'maxFloors', 'minRoadAccess', 'maxRoadAccess', 'bedrooms', 'bathrooms', 'kitchens',
  'diningRooms', 'livingRooms', 'carParkingSpots', 'bikeParkingSpots', 'tags', 'minBedrooms',
  'maxBedrooms', 'minBathrooms', 'maxBathrooms', 'minKitchens', 'maxKitchens',
  'minDiningRooms', 'maxDiningRooms', 'minLivingRooms', 'maxLivingRooms',
  'minCarParkingSpots', 'maxCarParkingSpots', 'minBikeParkingSpots', 'maxBikeParkingSpots',
  'limit', 'page', 'orderBy', 'agency', 'agent', 'include', 'fields',
]);

const RESERVED_SEARCH_PARAMETERS = new Set([
  'include', 'fields', 'orderBy', 'page', 'limit', 'agency', 'agent',
]);

type SearchInput = {
  q?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  statuses?: string[];
  orderBy?: 'newestFirst' | 'oldestFirst';
  agencyId?: string;
  agentId?: string;
};

// Convert URL list values to the same arrays accepted in POST filter objects.
function parseQueryValue(value: string, key: string): unknown {
  if (['purpose', 'category', 'type', 'listingBy', 'tags', 'ids'].includes(key)) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  if (key === 'isOwnerListing') return value === 'true' ? true : value === 'false' ? false : value;
  return value;
}

// Parse GET search data exclusively from the URL query string.
function parseGetInput(request: NextRequest): { input?: SearchInput; response?: NextResponse } {
  const params = request.nextUrl.searchParams;
  const invalidParameter = [...params.keys()].find((key) => !SEARCH_PARAMETERS.has(key));
  if (invalidParameter) {
    return { response: NextResponse.json({ success: false, error: `Unknown search parameter '${invalidParameter}'.` }, { status: 400 }) };
  }

  const filters: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (RESERVED_SEARCH_PARAMETERS.has(key) || ['q', 'query', 'search', 'searchTerm', 'search_term', 'status', 'statuses'].includes(key)) continue;
    if (key === 'agency' || key === 'agent') continue;
    filters[key] = parseQueryValue(value, key);
  }

  const input: SearchInput = {
    q: params.get('q') ?? params.get('query') ?? params.get('search') ?? params.get('searchTerm') ?? params.get('search_term') ?? undefined,
    filters,
    page: parseInteger(params.get('page'), 1),
    pageSize: parseInteger(params.get('limit'), 25),
    statuses: parseList(params.get('status') ?? params.get('statuses')),
    orderBy: params.get('orderBy') === 'oldestFirst' ? 'oldestFirst' : 'newestFirst',
    agencyId: params.get('agency') ?? undefined,
    agentId: params.get('agent') ?? undefined,
  };
  return { input };
}

// Parse integer pagination input, leaving range validation to the shared handler.
function parseInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

// Parse comma separated status and filter values.
function parseList(value: string | null): string[] | undefined {
  return value === null ? undefined : value.split(',').map((item) => item.trim()).filter(Boolean);
}

// Validate endpoint filters and call the shared property-search implementation.
async function runSearch(input: SearchInput) {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ success: false, error: 'page must be positive and pageSize must be between 1 and 100.' }, { status: 400 });
  }
  if (input.orderBy && !['newestFirst', 'oldestFirst'].includes(input.orderBy)) {
    return NextResponse.json({ success: false, error: 'orderBy must be newestFirst or oldestFirst.' }, { status: 400 });
  }

  const filters = input.filters ?? {};
  const parsedFilters = PropertyFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) {
    return NextResponse.json({ success: false, error: 'Invalid search filters.', details: parsedFilters.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await searchProperties({
    ...parsedFilters.data,
    ...(input.q !== undefined ? { q: input.q } : {}),
    page,
    limit: pageSize,
    statuses: input.statuses,
    orderBy: input.orderBy,
    agencyId: input.agencyId,
    agentId: input.agentId,
  });
  if (!result.success || !result.data) {
    return NextResponse.json({ success: false, error: result.error || 'Property search failed.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    properties: result.data.properties,
    totalCount: result.data.totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(result.data.totalCount / pageSize),
    appliedFilters: result.data.appliedFilters,
  });
}

// Handle URL based property search requests.
export async function GET(request: NextRequest) {
  try {
    const parsed = parseGetInput(request);
    if (parsed.response) return parsed.response;
    return await runSearch(parsed.input!);
  } catch (error) {
    await logger().type('bridge/api.v1/properties/search:GET').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// Handle JSON body based property search requests.
export async function POST(request: NextRequest) {
  try {
    const urlSearchParameter = [...request.nextUrl.searchParams.keys()].find((key) => SEARCH_PARAMETERS.has(key));
    if (urlSearchParameter) {
      return NextResponse.json({
        success: false,
        error: `Search parameter '${urlSearchParameter}' must be provided in the JSON body, not in the URL.`,
      }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    const bodyRecord = body as Record<string, unknown>;
    const allowedBodyKeys = new Set(['q', 'filters', 'page', 'pageSize', 'statuses', 'orderBy', 'agencyId', 'agentId']);
    const unknownKey = Object.keys(bodyRecord).find((key) => !allowedBodyKeys.has(key));
    if (unknownKey) return NextResponse.json({ success: false, error: `Unknown search field '${unknownKey}'.` }, { status: 400 });
    if (bodyRecord.q !== undefined && (typeof bodyRecord.q !== 'string' || bodyRecord.q.length > 500)) {
      return NextResponse.json({ success: false, error: 'q must be a string of at most 500 characters.' }, { status: 400 });
    }
    if (bodyRecord.filters !== undefined && (!bodyRecord.filters || typeof bodyRecord.filters !== 'object' || Array.isArray(bodyRecord.filters))) {
      return NextResponse.json({ success: false, error: 'filters must be a JSON object.' }, { status: 400 });
    }
    if (bodyRecord.statuses !== undefined && (!Array.isArray(bodyRecord.statuses) || bodyRecord.statuses.some((status) => typeof status !== 'string'))) {
      return NextResponse.json({ success: false, error: 'statuses must be an array of strings.' }, { status: 400 });
    }

    const input: SearchInput = {
      q: bodyRecord.q as string | undefined,
      filters: bodyRecord.filters as Record<string, unknown> | undefined,
      page: bodyRecord.page === undefined ? 1 : Number(bodyRecord.page),
      pageSize: bodyRecord.pageSize === undefined ? 25 : Number(bodyRecord.pageSize),
      statuses: bodyRecord.statuses as string[] | undefined,
      orderBy: bodyRecord.orderBy as SearchInput['orderBy'],
      agencyId: bodyRecord.agencyId as string | undefined,
      agentId: bodyRecord.agentId as string | undefined,
    };
    return await runSearch(input);
  } catch (error) {
    await logger().type('bridge/api.v1/properties/search:POST').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
