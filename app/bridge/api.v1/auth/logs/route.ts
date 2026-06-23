/**
 * GET /api/auth/logs
 *
 * Returns recent authentication error logs for debugging.
 * Should be protected in production (admin-only).
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
