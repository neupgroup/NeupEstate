/*
::neup.documentation::bridge-account-profile
::api GET /bridge/api.v1/accounts/[id]

Returns the public profile, accepted agency memberships, and count of active
properties represented by the account.

::end
*/
import { NextResponse } from 'next/server';
import { getAccountProfile } from '@/services/accounts/profile';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// Return the requested resource collection or item for a GET request.
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const account = await getAccountProfile(id);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...account });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
