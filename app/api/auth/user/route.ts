import { NextRequest } from 'next/server';
import { GET as getBridgeUser } from '@/app/bridge/api.v1/auth/user/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return getBridgeUser(req);
}
