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
import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

async function resolveLocalLookup(accountId?: string, neupId?: string) {
  const account = await prisma.account.findFirst({
    where: accountId
      ? { id: accountId }
      : { neupId },
    select: {
      id: true,
      neupId: true,
      displayName: true,
      displayImage: true,
      accountType: true,
    },
  });

  if (!account) {
    return null;
  }

  return {
    success: true as const,
    account: {
      accountId: account.id,
      displayName: account.displayName?.trim() || account.neupId?.trim() || account.id,
      displayImage: account.displayImage?.trim() || '',
      accountType: account.accountType?.trim() || 'individual',
      neupId: account.neupId?.trim() || '',
    },
  };
}

async function resolveLookup(accountId?: string, neupId?: string) {
  if (!accountId && !neupId) {
    return NextResponse.json(
      { success: false, error: 'Provide either accountId or neupId.' },
      { status: 400 },
    );
  }

  const localResult = await resolveLocalLookup(accountId, neupId);
  if (localResult) {
    return NextResponse.json(localResult);
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

const getHandler = async (req: NextRequest) => {
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
};

const postHandler = async (req: NextRequest) => {
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
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/accounts/lookup:GET' }, getHandler);
export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/accounts/lookup:POST' }, postHandler);
