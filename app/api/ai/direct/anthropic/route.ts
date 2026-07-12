/*
::neup.documentation::api-ai-direct-anthropic-route
::api POST /api/ai/direct/anthropic

Routes AI generation requests directly to Anthropic.

::public

Accepts the shared AI JSON request shape used by the other AI endpoints and returns normalized text plus the raw provider response.

::public end

::private

Provider dispatch is delegated to `handleAiProviderRequest()` so the route stays transport-only.

::private end

::end
*/

import type { NextRequest } from 'next/server';
import { handleAiProviderRequest } from '@/services/ai/provider-endpoint-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => handleAiProviderRequest(req, 'anthropic');

export const POST = withRequestDevLog({ source: 'api', name: 'api/ai/direct/anthropic:POST' }, postHandler);
