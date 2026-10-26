/*
::neup.documentation::bridge-requirements-collection
::api GET|POST /bridge/api.v1/requirements
::public

GET lists requirements with limit and offset pagination. `postedBy=me` lists
only the authenticated account's requirements. POST creates a requirement for
the authenticated account; userId in the body is ignored.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import { CreateRequirementSchema } from '@/types/requirements';
import { requireIdentity } from '@/services/properties/action-helpers';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

export const dynamic = 'force-dynamic';

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
}

function getPagination(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawLimit = Number(params.get('limit') ?? 25);
  const rawOffset = Number(params.get('offset') ?? 0);
  return {
    limit: Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 25,
    offset: Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const postedBy = params.get('postedBy');
    if (postedBy && postedBy !== 'me') {
      return NextResponse.json({ success: false, error: "postedBy must be 'me'." }, { status: 400 });
    }
    const userId = postedBy === 'me' ? await requireIdentity() : undefined;
    const { limit, offset } = getPagination(request);
    const where = userId ? { userId } : {};
    const [data, total] = await Promise.all([
      prisma.requirement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.requirement.count({ where }),
    ]);
    return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
  } catch (error) {
    await logger().type('bridge/api.v1/requirements:GET').data({ error: String(error), details: {} }).log();
    const status = isUnauthorized(error) ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : 'Internal server error.' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.public.requirementCreate);
    const userId = await requireIdentity();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    const parsed = CreateRequirementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid requirement.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = await prisma.requirement.create({ data: { ...parsed.data, userId } });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    await logger().type('bridge/api.v1/requirements:POST').data({ error: String(error), details: {} }).log();
    const unauthorized = isUnauthorized(error);
    const denied = error instanceof Error && error.message.startsWith('Permission denied:');
    const status = unauthorized ? 401 : denied ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status });
  }
}
