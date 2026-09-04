/*
::neup.documentation::bridge-agencies-collection
::api GET /bridge/api.v1/agencies
::public

Returns the public list of agencies. Supports `limit` and `offset` query
parameters for pagination.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { getPublicAgencyAccountCount, getPublicAgencyAccounts } from '@/services/agency-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest) => {
  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(params.get('limit') ?? 10) || 10, 1), 25);
    const offset = Math.max(Number(params.get('offset') ?? 0) || 0, 0);
    const [agencies, total] = await Promise.all([
      getPublicAgencyAccounts({ limit, offset }),
      getPublicAgencyAccountCount(),
    ]);

    return NextResponse.json({
      data: agencies,
      pagination: { limit, offset, total, hasMore: offset + agencies.length < total },
    });
  } catch (error) {
    await logProblem(error, 'bridge/api.v1/agencies:GET');
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/agencies:GET' }, getHandler);
