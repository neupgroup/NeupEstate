import { NextRequest } from 'next/server';
import { GET as getBridgeUser } from '@/app/bridge/api.v1/auth/user/route';

export const dynamic = 'force-dynamic';

// Handle the GET request and return the requested resource.
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  void context;
  return getBridgeUser(req);
}
