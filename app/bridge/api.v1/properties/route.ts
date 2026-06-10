/**
 * GET /bridge/api.v1/properties
 *
 * Returns active properties linked to an agency or account id.
 *
 * Query params (exactly one required):
 *   ?agency_id=<accountId>&fields=id,title,price&limit=20&offset=0
 *   ?account_id=<accountId>&fields=id,title,price&limit=20&offset=0
 *
 * Legacy aliases are also accepted:
 *   ?agency=<accountId>
 *   ?agent=<accountId>
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

function readQueryValue(
  searchParams: URLSearchParams,
  primaryKey: string,
  fallbackKey?: string,
): string | undefined {
  const primaryValue = searchParams.get(primaryKey)?.trim() || undefined;
  const fallbackValue = fallbackKey ? searchParams.get(fallbackKey)?.trim() || undefined : undefined;

  if (primaryValue && fallbackValue && primaryValue !== fallbackValue) {
    throw new Error(`Provide only one of ${primaryKey} or ${fallbackKey}.`);
  }

  return primaryValue || fallbackValue;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  try {
    const agencyId = readQueryValue(searchParams, 'agency_id', 'agency');
    const accountId = readQueryValue(searchParams, 'account_id', 'agent');

    if (!agencyId && !accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either agency_id or account_id.',
        },
        { status: 400 },
      );
    }

    if (agencyId && accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide only one of agency_id or account_id.',
        },
        { status: 400 },
      );
    }

    const result = await getBridgePropertiesByAccount({
      agencyId,
      agentId: accountId,
      fields: parseFields(searchParams.get('fields')),
      limit: parsePositiveInteger(searchParams.get('limit'), 20),
      offset: parseOffset(searchParams.get('offset')),
    });

    return NextResponse.json({
      success: true,
      filter: agencyId
        ? { type: 'agency', accountId: agencyId }
        : { type: 'account', accountId },
      ...result,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (error.message.startsWith('Provide only one of ')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    await logProblem(err, 'bridge/api.v1/properties');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error.',
      },
      { status: 500 },
    );
  }
}
