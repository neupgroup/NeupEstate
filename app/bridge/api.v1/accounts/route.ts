/*
::neup.documentation::bridge-accounts-collection
::api GET /bridge/api.v1/accounts?type=independentAgent|agency|companyAgent

Lists public account profiles by account category. Optional pagination uses
`limit` (default 10, maximum 25) and `offset` (default 0).

::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@neup/logica/logger';
import { isSupportedAccountProfileType, listAccountProfiles } from '@/services/accounts/profile';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const types = params.getAll('type');
  if (types.length !== 1 || !isSupportedAccountProfileType(types[0])) {
    return NextResponse.json({
      success: false,
      error: "Provide exactly one type: 'independentAgent', 'agency', or 'companyAgent'.",
    }, { status: 400 });
  }

  const rawLimit = params.get('limit');
  const rawOffset = params.get('offset');
  const requestedLimit = rawLimit === null ? 10 : Number(rawLimit);
  const requestedOffset = rawOffset === null ? 0 : Number(rawOffset);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || !Number.isSafeInteger(requestedOffset) || requestedOffset < 0) {
    return NextResponse.json({ success: false, error: 'limit must be a positive integer and offset must be a non-negative integer.' }, { status: 400 });
  }

  try {
    const limit = Math.min(requestedLimit, 25);
    const offset = requestedOffset;
    const result = await listAccountProfiles(types[0], offset, limit);
    return NextResponse.json({
      success: true,
      accounts: result.accounts,
      pagination: { limit, offset, total: result.total, hasMore: offset + result.accounts.length < result.total },
    });
  } catch (error) {
    await logger().type('bridge/api.v1/accounts:GET').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
