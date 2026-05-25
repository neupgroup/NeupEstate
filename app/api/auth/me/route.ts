import { NextRequest } from 'next/server';
import { getAuthenticatedMeResponse } from '@/services/auth/me';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return getAuthenticatedMeResponse(req);
}
