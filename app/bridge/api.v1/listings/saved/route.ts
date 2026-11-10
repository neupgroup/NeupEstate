/*
::neup.documentation::bridge-listings-saved
::api GET|POST|DELETE /bridge/api.v1/listings/saved
::public

GET lists saved-property records for `account=me` or an account ID. Viewing
another account's list requires manage.account.view. Results contain property
IDs; use GET /bridge/api.v1/listings/[id] for property details.

POST body: { "propertyId": "property_id" }. DELETE accepts either `id` (the
saved record ID) or `propertyId` as a query parameter and only affects the
authenticated account.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { requireIdentity } from '@/services/listings/action-helpers';
import { hasPermission, requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

export const dynamic = 'force-dynamic';

const SaveListingSchema = z.object({ propertyId: z.string().min(1) });

// Read validated pagination values from the request URL.
function getPagination(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedLimit = Number(params.get('limit') ?? 25);
  const requestedOffset = Number(params.get('offset') ?? 0);
  return {
    // Cap saved-property pages at 100 records.
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 25,
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
  };
}

// Resolve the requested saved-property account and enforce cross-account access.
async function getTargetAccountId(request: NextRequest, currentAccountId: string): Promise<string | NextResponse> {
  const requestedAccount = request.nextUrl.searchParams.get('account');
  if (!requestedAccount) return NextResponse.json({ success: false, error: "account must be 'me' or an account ID." }, { status: 400 });
  if (requestedAccount === 'me') return currentAccountId;
  if (!await hasPermission(PERMISSIONS.manage.accountView)) {
    return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
  }
  return requestedAccount;
}

// Map known authorization errors to public HTTP error responses.
function errorResponse(error: unknown) {
  const unauthorized = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
  const denied = error instanceof Error && error.message.startsWith('Permission denied:');
  const status = unauthorized ? 401 : denied ? 403 : 500;
  return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status });
}

/**
 * GET /bridge/api.v1/listings/saved?account=me
 * GET /bridge/api.v1/listings/saved?account=<accountId>&limit=25&offset=0
 * Returns { data: [{ id, accountId, propertyId, savedAt }], pagination }.
 */
export async function GET(request: NextRequest) {
  try {
    const currentAccountId = await requireIdentity();
    const accountId = await getTargetAccountId(request, currentAccountId);
    if (accountId instanceof NextResponse) return accountId;
    if (accountId === currentAccountId) await requirePermission(PERMISSIONS.estate.listing.save);
    const { limit, offset } = getPagination(request);
    const where = { accountId };
    const [data, total] = await Promise.all([
      prisma.listingsSaved.findMany({ where, orderBy: { savedAt: 'desc' }, skip: offset, take: limit }),
      prisma.listingsSaved.count({ where }),
    ]);
    return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /bridge/api.v1/listings/saved
 * JSON body: { "propertyId": "property_id" }. Saves for the current account.
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.estate.listing.save);
    const accountId = await requireIdentity();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    const parsed = SaveListingSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid saved property.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const property = await prisma.listing.findUnique({ where: { id: parsed.data.propertyId }, select: { id: true } });
    if (!property) return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
    const existing = await prisma.listingsSaved.findFirst({ where: { accountId, propertyId: parsed.data.propertyId } });
    const data = existing ?? await prisma.listingsSaved.create({ data: { accountId, propertyId: parsed.data.propertyId } });
    return NextResponse.json({ success: true, data }, { status: existing ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /bridge/api.v1/listings/saved?id=<savedId> or ?propertyId=<propertyId> */
export async function DELETE(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.estate.listing.save);
    const accountId = await requireIdentity();
    const params = request.nextUrl.searchParams;
    const id = params.get('id');
    const propertyId = params.get('propertyId');
    if (Boolean(id) === Boolean(propertyId)) {
      return NextResponse.json({ success: false, error: 'Provide exactly one of id or propertyId.' }, { status: 400 });
    }
    const result = await prisma.listingsSaved.deleteMany({ where: { accountId, ...(id ? { id } : { propertyId: propertyId! }) } });
    if (!result.count) return NextResponse.json({ success: false, error: 'Saved property not found.' }, { status: 404 });
    return NextResponse.json({ success: true, ...(id ? { id } : { propertyId }) });
  } catch (error) {
    return errorResponse(error);
  }
}
