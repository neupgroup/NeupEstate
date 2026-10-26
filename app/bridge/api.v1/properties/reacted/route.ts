/*
::neup.documentation::bridge-properties-reacted
::api GET|POST|DELETE /bridge/api.v1/properties/reacted
::public

GET lists reaction records for `account=me` or an account ID. Viewing another
account's list requires manage.account.view. Records include propertyId; use
GET /bridge/api.v1/properties/[id] to fetch property details.

POST body: { "propertyId": "property_id", "reaction": "Liked" }. Reaction
values are Liked, Disliked, and Reported. DELETE accepts either `id` (reaction
record ID) or `propertyId` as a query parameter and only affects the current
account.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import { requireIdentity } from '@/services/properties/action-helpers';
import { hasPermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

export const dynamic = 'force-dynamic';

const ReactionSchema = z.object({
  propertyId: z.string().min(1),
  reaction: z.enum(['Liked', 'Disliked', 'Reported']),
});

function getPagination(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedLimit = Number(params.get('limit') ?? 25);
  const requestedOffset = Number(params.get('offset') ?? 0);
  return {
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 25,
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
  };
}

async function getTargetAccountId(request: NextRequest, currentAccountId: string): Promise<string | NextResponse> {
  const requestedAccount = request.nextUrl.searchParams.get('account');
  if (!requestedAccount) return NextResponse.json({ success: false, error: "account must be 'me' or an account ID." }, { status: 400 });
  if (requestedAccount === 'me') return currentAccountId;
  if (!await hasPermission(PERMISSIONS.manage.accountView)) {
    return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
  }
  return requestedAccount;
}

function errorResponse(error: unknown) {
  const unauthorized = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
  return NextResponse.json({ success: false, error: unauthorized ? 'Authentication required.' : 'Internal server error.' }, { status: unauthorized ? 401 : 500 });
}

/**
 * GET /bridge/api.v1/properties/reacted?account=me
 * GET /bridge/api.v1/properties/reacted?account=<accountId>&limit=25&offset=0
 * Returns { data: [{ id, trackedId, propertyId, onType, reaction, reactedAt }], pagination }.
 * Fetch property details separately from GET /bridge/api.v1/properties/[id].
 */
export async function GET(request: NextRequest) {
  try {
    const currentAccountId = await requireIdentity();
    const accountId = await getTargetAccountId(request, currentAccountId);
    if (accountId instanceof NextResponse) return accountId;
    const { limit, offset } = getPagination(request);
    const propertyId = request.nextUrl.searchParams.get('propertyId') || undefined;
    const where = { trackedId: accountId, ...(propertyId ? { propertyId } : {}) };
    const [data, total] = await Promise.all([
      prisma.reactedProperty.findMany({ where, orderBy: { reactedAt: 'desc' }, skip: offset, take: limit }),
      prisma.reactedProperty.count({ where }),
    ]);
    return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
  } catch (error) {
    await logger().type('bridge/api.v1/properties/reacted:GET').data({ error: String(error), details: {} }).log();
    return errorResponse(error);
  }
}

/** POST /bridge/api.v1/properties/reacted — { "propertyId": "...", "reaction": "Liked" }. */
export async function POST(request: NextRequest) {
  try {
    const accountId = await requireIdentity();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    const parsed = ReactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid reaction.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const property = await prisma.property.findUnique({ where: { id: parsed.data.propertyId }, select: { id: true } });
    if (!property) return NextResponse.json({ success: false, error: 'Property not found.' }, { status: 404 });
    const existing = await prisma.reactedProperty.findFirst({
      where: { trackedId: accountId, propertyId: parsed.data.propertyId, onType: 'account' },
      orderBy: { reactedAt: 'desc' },
    });
    const data = existing
      ? await prisma.reactedProperty.update({ where: { id: existing.id }, data: { reaction: parsed.data.reaction, reactedAt: new Date() } })
      : await prisma.reactedProperty.create({ data: { ...parsed.data, trackedId: accountId, onType: 'account' } });
    return NextResponse.json({ success: true, data }, { status: existing ? 200 : 201 });
  } catch (error) {
    await logger().type('bridge/api.v1/properties/reacted:POST').data({ error: String(error), details: {} }).log();
    return errorResponse(error);
  }
}

/** DELETE /bridge/api.v1/properties/reacted?id=<reactionId> or ?propertyId=<propertyId> */
export async function DELETE(request: NextRequest) {
  try {
    const accountId = await requireIdentity();
    const params = request.nextUrl.searchParams;
    const id = params.get('id');
    const propertyId = params.get('propertyId');
    if (Boolean(id) === Boolean(propertyId)) {
      return NextResponse.json({ success: false, error: 'Provide exactly one of id or propertyId.' }, { status: 400 });
    }
    const result = await prisma.reactedProperty.deleteMany({ where: { trackedId: accountId, ...(id ? { id } : { propertyId: propertyId! }) } });
    if (!result.count) return NextResponse.json({ success: false, error: 'Reaction not found.' }, { status: 404 });
    return NextResponse.json({ success: true, ...(id ? { id } : { propertyId }) });
  } catch (error) {
    await logger().type('bridge/api.v1/properties/reacted:DELETE').data({ error: String(error), details: {} }).log();
    return errorResponse(error);
  }
}
