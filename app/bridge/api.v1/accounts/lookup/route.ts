/**
 * ::neup.documentation::bridge-account-lookup-route
 * ::api GET|POST /bridge/api.v1/accounts/lookup
 *
 * Resolves public account profile information by `accountId` or `neupId`.
 *
 * ::public
 *
 * This route returns a public account summary with:
 * - `accountId`
 * - `displayName`
 * - `displayImage`
 * - `accountType`
 * - `neupId`
 *
 * Supported inputs:
 * - `GET ?accountId=<id>`
 * - `GET ?neupId=<handle>`
 * - `POST { accountId }`
 * - `POST { neupId }`
 *
 * Response behavior:
 * - `200` when an account is resolved
 * - `400` when neither `accountId` nor `neupId` is provided
 * - `404` when no account can be resolved
 * - `500` on unexpected server failure
 *
 * ::public end
 *
 * ::private
 *
 * Resolution order is intentional:
 * 1. Check the local `account` row first.
 * 2. If the local row already has a real `displayName`, return it immediately.
 * 3. If the local row exists but only has fallback identity data, query the upstream account lookup service to fetch the richer profile name.
 * 4. If upstream lookup fails but a local row exists, return the local fallback instead of failing the request.
 *
 * This avoids showing raw account ids in UI surfaces like the header subtitle when a richer upstream profile display name is available.
 *
 * ::private end
 * ::end
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountInformation } from '@/services/account/lookup';
import { prisma } from '@/core/database/prisma';
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
    hasDisplayName: Boolean(account.displayName?.trim()),
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
  if (localResult?.hasDisplayName) {
    return NextResponse.json(localResult);
  }

  const result = await getAccountInformation(
    accountId ? { accountId } : { neupId: neupId! },
  );

  if (!result.found) {
    if (localResult) {
      return NextResponse.json({
        success: true,
        account: localResult.account,
      });
    }

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
