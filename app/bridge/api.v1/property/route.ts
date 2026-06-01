/**
 * GET /bridge/api.v1/property
 *
 * Returns active properties linked to an agency or agent account id.
 *
 * Query params:
 *   ?agency=<accountId>&fields=id,title,price&limit=20&offset=0
 *   ?agent=<accountId>&fields=id,title,price&limit=20&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBridgePropertiesByAccount } from '@/services/property-service';
import { logProblem } from '@/services/problem-service';

export const dynamic = 'force-dynamic';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOffset(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseFields(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((field) => field.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agencyId = searchParams.get('agency')?.trim() || undefined;
  const agentId = searchParams.get('agent')?.trim() || undefined;

  if (!agencyId && !agentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Provide either agency or agent account id.',
      },
      { status: 400 },
    );
  }

  if (agencyId && agentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Provide only one of agency or agent.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await getBridgePropertiesByAccount({
      agencyId,
      agentId,
      fields: parseFields(searchParams.get('fields')),
      limit: parsePositiveInteger(searchParams.get('limit'), 20),
      offset: parseOffset(searchParams.get('offset')),
    });

    return NextResponse.json({
      success: true,
      filter: agencyId
        ? { type: 'agency', accountId: agencyId }
        : { type: 'agent', accountId: agentId },
      ...result,
    });
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/property');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error.',
      },
      { status: 500 },
    );
  }
}
