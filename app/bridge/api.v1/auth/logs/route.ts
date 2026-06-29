/**
 * ::neup.documentation::bridge-auth-logs-route
 * ::api GET /bridge/api.v1/auth/logs
 *
 * Returns recent authentication log entries for debugging.
 *
 * ::public
 *
 * This route returns recent auth log lines as parsed JSON where possible.
 *
 * Query params:
 * - `lines=<number>`: number of recent log lines to read, default `100`
 *
 * Response shape:
 * - `count`: number of log entries returned
 * - `logs`: parsed JSON objects or `{ raw }` wrappers for non-JSON lines
 *
 * Response behavior:
 * - `200` with log data
 * - `500` when log reading fails
 *
 * ::public end
 *
 * ::private
 *
 * The route is currently open and includes a note to add admin protection in
 * production. It should not be treated as a public diagnostics endpoint long term.
 *
 * Parsing is best-effort: each line is JSON-decoded independently, and invalid
 * JSON is preserved as raw text instead of being dropped.
 *
 * ::private end
 * ::end
 */

import { NextRequest, NextResponse } from 'next/server';
import { readAuthLogs } from '@/services/auth';
import { withRequestDevLog } from '@/services/site-dev-log-service';

const getHandler = async (req: NextRequest) => {
  // TODO: Add admin authentication check in production
  // const account = await requireRegisteredAuth(req);
  // if (account.aid !== ADMIN_ACCOUNT_ID) {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  try {
    const { searchParams } = req.nextUrl;
    const lines = parseInt(searchParams.get('lines') || '100', 10);

    const logs = await readAuthLogs(lines);

    return NextResponse.json({
      count: logs.length,
      logs: logs.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read logs', message: (error as Error).message },
      { status: 500 }
    );
  }
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/auth/logs' }, getHandler);
