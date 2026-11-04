/*
::neup.documentation::bridge-locations-collection
::api GET /bridge/api.v1/locations
::public

Returns locations with their parent location. Supports exact `id`, `slug`, `type`,
and `status` filters, case-insensitive `query` matching against title and
postal code, and `limit`/`offset` pagination. Limit defaults to 50 and is
capped at 100. This endpoint is public and read-only.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_PARAMETERS = new Set(['id', 'slug', 'type', 'status', 'query', 'limit', 'offset']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Parse an optional non-negative integer query parameter.
function readIntegerParameter(value: string | null, fallback: number): number | undefined {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return undefined;
  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) ? parsedValue : undefined;
}

// Return filtered locations and pagination metadata for public callers.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const unknownParameter = [...params.keys()].find((parameter) => !ALLOWED_PARAMETERS.has(parameter));
  if (unknownParameter) {
    return NextResponse.json({ success: false, error: `Unknown parameter '${unknownParameter}'.` }, { status: 400 });
  }

  for (const parameter of ALLOWED_PARAMETERS) {
    if (params.getAll(parameter).length > 1) {
      return NextResponse.json({ success: false, error: `Parameter '${parameter}' must be provided once.` }, { status: 400 });
    }
  }

  const requestedLimit = readIntegerParameter(params.get('limit'), DEFAULT_LIMIT);
  const offset = readIntegerParameter(params.get('offset'), 0);
  if (requestedLimit === undefined || requestedLimit < 1 || offset === undefined) {
    return NextResponse.json({ success: false, error: 'limit must be a positive integer and offset must be a non-negative integer.' }, { status: 400 });
  }

  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const id = params.get('id')?.trim();
  const slug = params.get('slug')?.trim();
  const type = params.get('type')?.trim();
  const status = params.get('status')?.trim();
  const query = params.get('query')?.trim();
  const where = {
    ...(id ? { id } : {}),
    ...(slug ? { slug } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
        { postalCode: { contains: query, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  try {
    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: [{ type: 'asc' }, { title: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          childOf: true,
          postalCode: true,
          status: true,
          parent: { select: { id: true, title: true, type: true } },
        },
      }),
      prisma.location.count({ where }),
    ]);

    return NextResponse.json({
      data: locations,
      pagination: { limit, offset, total, hasMore: offset + locations.length < total },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to retrieve locations.' }, { status: 500 });
  }
}
