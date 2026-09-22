/*
::neup.documentation::bridge-agencies-collection
::api GET /bridge/api.v1/agencies
::public

Returns the public list of agencies. Supports `limit` and `offset` query
parameters for pagination. Filters: `id`, `name`, `query`, `neupId`, and `agent`.
Both rows and totals use the same filters. Limits default to 10 and are capped at 25.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { getPublicAgencyAccountCount, getPublicAgencyAccounts } from '@/services/agencies/agency/service';
import { logger } from "@neup/logica/logger";
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest) => {
  try {
    const params = request.nextUrl.searchParams;
    const requestedLimit = Number(params.get('limit') ?? 10);
    const requestedOffset = Number(params.get('offset') ?? 0);
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 25) : 10;
    const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
    const filters = {
      id: params.get('id')?.trim() || undefined,
      name: params.get('name')?.trim() || undefined,
      query: params.get('query')?.trim() || undefined,
      neupId: params.get('neupId')?.trim() || undefined,
      agent: params.get('agent')?.trim() || undefined,
    };
    const [agencies, total] = await Promise.all([
      getPublicAgencyAccounts({ limit, offset, filters }),
      getPublicAgencyAccountCount(filters),
    ]);

    return NextResponse.json({
      data: agencies,
      pagination: { limit, offset, total, hasMore: offset + agencies.length < total },
    });
  } catch (error) {
    await logger().type('bridge/api.v1/agencies:GET').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/agencies:GET' }, getHandler);
