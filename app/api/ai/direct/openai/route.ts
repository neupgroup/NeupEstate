/*
::neup.documentation::api-ai-direct-openai-route
::api POST /api/ai/direct/openai

Routes AI generation requests directly to OpenAI.

::public

Accepts the shared AI JSON request shape used by the other AI endpoints and returns normalized text plus the raw provider response.

::public end

::private

This route uses the shared provider endpoint service so validation and error handling stay consistent across providers.

::private end

::end
*/

import type { NextRequest } from 'next/server';
import { handleAiProviderRequest } from '@/services/ai/provider-endpoint-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => handleAiProviderRequest(req, 'openai');

export const POST = withRequestDevLog({ source: 'api', name: 'api/ai/direct/openai:POST' }, postHandler);
