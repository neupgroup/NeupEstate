import { NextRequest } from 'next/server';
import { getAuthenticatedMeResponse } from '@/services/auth/me';

export const dynamic = 'force-dynamic';

// Handle the GET request and return the requested resource.
const getHandler = async (req: NextRequest) => {
  return getAuthenticatedMeResponse(req);
};

export const GET = getHandler;
