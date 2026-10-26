/*
::neup.documentation::bridge-requirement-item
::api GET|PATCH|DELETE /bridge/api.v1/requirements/[id]
::public

GET returns a requirement by id. PATCH updates it and DELETE removes it. PATCH
and DELETE require authentication and the authenticated account must own the
requirement. Missing requirements return 404; another account's requirements
are not disclosed.

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import { CreateRequirementSchema } from '@/types/requirements';
import { requireIdentity } from '@/services/properties/action-helpers';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const data = await prisma.requirement.findUnique({ where: { id } });
    if (!data) return NextResponse.json({ success: false, error: 'Requirement not found.' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    await logger().type('bridge/api.v1/requirements/[id]:GET').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const userId = await requireIdentity();
    const { id } = await params;
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
    const { userId: _ignoredUserId, ...data } = parsed.data;
    const result = await prisma.requirement.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return NextResponse.json({ success: false, error: 'Requirement not found.' }, { status: 404 });
    const updated = await prisma.requirement.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    await logger().type('bridge/api.v1/requirements/[id]:PATCH').data({ error: String(error), details: {} }).log();
    const status = isUnauthorized(error) ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : 'Internal server error.' }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const userId = await requireIdentity();
    const { id } = await params;
    const result = await prisma.requirement.deleteMany({ where: { id, userId } });
    if (result.count === 0) return NextResponse.json({ success: false, error: 'Requirement not found.' }, { status: 404 });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    await logger().type('bridge/api.v1/requirements/[id]:DELETE').data({ error: String(error), details: {} }).log();
    const status = isUnauthorized(error) ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : 'Internal server error.' }, { status });
  }
}
