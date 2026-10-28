/*
::neup.documentation::bridge-properties-account-collections
::api GET /bridge/api.v1/properties/account/[accountId]/[collection]

Lists an account's listed, saved, owned, or actively worked properties. Only
the authenticated account or an account manager may read these collections.

::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@neup/logica/logger';
import { requireIdentity } from '@/services/properties/action-helpers';
import { hasPermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import {
  getPropertiesBeingWorked,
  getPropertiesByAccount,
  getPropertiesListed,
  getPropertiesOwned,
  getPropertiesSaved,
} from '@/services/properties/list';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ accountId: string; collection: string }> };
const COLLECTIONS = ['by-account', 'listed', 'saved', 'owned', 'being-worked'] as const;

function pagination(request: NextRequest) {
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 20);
  const requestedOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
  return {
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20,
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
  };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { accountId, collection } = await context.params;
    if (!COLLECTIONS.includes(collection as (typeof COLLECTIONS)[number])) {
      return NextResponse.json({ success: false, error: 'Unknown account property collection.' }, { status: 404 });
    }

    const currentAccountId = await requireIdentity();
    if (accountId !== currentAccountId && !await hasPermission(PERMISSIONS.manage.accountView)) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { offset, limit } = pagination(request);
    const getProperties = {
      'by-account': getPropertiesByAccount,
      listed: getPropertiesListed,
      saved: getPropertiesSaved,
      owned: getPropertiesOwned,
      'being-worked': getPropertiesBeingWorked,
    }[collection as (typeof COLLECTIONS)[number]];
    const properties = await getProperties(accountId, offset, limit);
    return NextResponse.json({
      success: true,
      properties,
      pagination: { offset, limit },
    });
  } catch (error) {
    await logger().type('bridge/api.v1/properties/account/[accountId]/[collection]:GET').data({ error: String(error), details: {} }).log();
    const unauthorized = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
    return NextResponse.json({ success: false, error: unauthorized ? 'Authentication required.' : 'Internal server error.' }, { status: unauthorized ? 401 : 500 });
  }
}
