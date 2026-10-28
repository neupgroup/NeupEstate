/*
::neup.documentation::bridge-account-profile
::api GET /bridge/api.v1/accounts/[id]

Returns the public profile, accepted agency memberships, and count of active
properties represented by the account.

::end
*/
import { NextResponse } from 'next/server';
import { logger } from '@neup/logica/logger';
import { getAccountProfile } from '@/services/accounts/profile';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const account = await getAccountProfile(id);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...account });
  } catch (error) {
    await logger().type('bridge/api.v1/accounts/[id]:GET').data({ error: String(error), details: {} }).log();
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
