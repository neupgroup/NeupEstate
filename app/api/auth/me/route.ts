import { NextRequest } from 'next/server';
import { getAuthenticatedMeResponse } from '@/services/auth/me';

export const dynamic = 'force-dynamic';

const getHandler = async (req: NextRequest) => {
  return getAuthenticatedMeResponse(req);
};

export const GET = getHandler;
