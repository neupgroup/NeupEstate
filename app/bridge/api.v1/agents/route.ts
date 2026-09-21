/*
::neup.documentation::bridge-agents-collection
::api GET /bridge/api.v1/agents
::public

Returns the public list of agents. Supports `limit` and `offset` query
parameters for pagination. Filters: `id`, `name`, `query`, `neupId`, and `agency`.
Both rows and totals use the same filters. Limits default to 10 and are capped at 25.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { getAgentCount, getAgents } from '@/services/agent-service';
import { logProblem } from '@/services/problem-service';
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
      agency: params.get('agency')?.trim() || undefined,
    };
    const [agents, total] = await Promise.all([
      getAgents({ limit, offset, filters }),
      getAgentCount(filters),
    ]);

    return NextResponse.json({
      data: agents,
      pagination: { limit, offset, total, hasMore: offset + agents.length < total },
    });
  } catch (error) {
    await logProblem(error, 'bridge/api.v1/agents:GET');
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/agents:GET' }, getHandler);
