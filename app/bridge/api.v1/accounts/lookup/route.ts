/**
 * GET /bridge/api.v1/accounts/lookup
 *
 * Resolves public account information by accountId or neupId.
 * No authentication required — these are public-facing profile fields.
 *
 * Query params (exactly one required):
 *   ?accountId=<uuid>
 *   ?neupId=<handle>        e.g. @neupcloud
 *
 * 200 — account found
 *   { success: true, account: { accountId, displayName, displayImage, accountType, neupId } }
 *
 * 400 — neither param provided
 *   { success: false, error: "..." }
 *
 * 404 — no account matched
 *   { success: false, error: "..." }
 *
 * 500 — upstream error
 *   { success: false, error: "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountInformation } from '@/services/account/lookup';
import { logProblem } from '@/services/problem-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get('accountId')?.trim() || undefined;
  const neupId    = searchParams.get('neupId')?.trim()    || undefined;

  // 400 — neither param provided
  if (!accountId && !neupId) {
    return NextResponse.json(
      { success: false, error: 'Provide either ?accountId or ?neupId.' },
      { status: 400 },
    );
  }

  try {
    const result = await getAccountInformation(
      accountId ? { accountId } : { neupId: neupId! },
    );

    if (!result.found) {
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, account: result.account });
  } catch (err: any) {
    await logProblem(err, 'bridge/api.v1/accounts/lookup');
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
