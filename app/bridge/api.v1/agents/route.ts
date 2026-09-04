/*
::neup.documentation::bridge-agents-collection
::api GET /bridge/api.v1/agents
::public

Returns the public list of agents. Supports `limit` and `offset` query
parameters for pagination.

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
    const limit = Math.min(Math.max(Number(params.get('limit') ?? 10) || 10, 1), 25);
    const offset = Math.max(Number(params.get('offset') ?? 0) || 0, 0);
    const [agents, total] = await Promise.all([
      getAgents({ limit, offset }),
      getAgentCount(),
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
