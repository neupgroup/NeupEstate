/*
::neup.documentation::bridge-listings-account-collections
::api GET /bridge/api.v1/listings/account/[accountId]/[collection]

Lists an account's listed, saved, owned, or actively worked properties. Only
the authenticated account or an account manager may read these collections.

::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity } from '@/services/listings/action-helpers';
import { hasPermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import {
  getListingsBeingWorked,
  getListingsByAccount,
  getListingsListed,
  getListingsOwned,
  getListingsSaved,
} from '@/services/listings/list';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ accountId: string; collection: string }> };
const COLLECTIONS = ['by-account', 'listed', 'saved', 'owned', 'being-worked'] as const;

// Parse bounded pagination values for the requested property collection.
function pagination(request: NextRequest) {
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 20);
  const requestedOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
  return {
    // Cap account property pages at 100 records.
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20,
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
  };
}

// Return the requested resource collection or item for a GET request.
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
    const getListings = {
      'by-account': getListingsByAccount,
      listed: getListingsListed,
      saved: getListingsSaved,
      owned: getListingsOwned,
      'being-worked': getListingsBeingWorked,
    }[collection as (typeof COLLECTIONS)[number]];
    const listings = await getListings(accountId, offset, limit);
    return NextResponse.json({
      success: true,
      listings,
      pagination: { offset, limit },
    });
  } catch (error) {
    const unauthorized = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
    return NextResponse.json({ success: false, error: unauthorized ? 'Authentication required.' : 'Internal server error.' }, { status: unauthorized ? 401 : 500 });
  }
}
