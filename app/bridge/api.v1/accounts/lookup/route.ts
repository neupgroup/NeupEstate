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

async function resolveLookup(accountId?: string, neupId?: string) {
  if (!accountId && !neupId) {
    return NextResponse.json(
      { success: false, error: 'Provide either accountId or neupId.' },
      { status: 400 },
    );
  }

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
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get('accountId')?.trim() || undefined;
  const neupId    = searchParams.get('neupId')?.trim()    || undefined;

  try {
    return await resolveLookup(accountId, neupId);
  } catch (err: any) {
    await logProblem(err, 'bridge/api.v1/accounts/lookup');
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Support body fields and header-based clients (e.g., Postman setups).
    const accountId =
      body?.accountId?.toString().trim() ||
      req.headers.get('accountId')?.trim() ||
      undefined;

    const neupId =
      body?.neupId?.toString().trim() ||
      req.headers.get('neupId')?.trim() ||
      undefined;

    return await resolveLookup(accountId, neupId);
  } catch (err: any) {
    await logProblem(err, 'bridge/api.v1/accounts/lookup:POST');
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
