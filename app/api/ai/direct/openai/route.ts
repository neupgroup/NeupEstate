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
import { handleAiProviderRequest } from '@/services/intelligence/provider-endpoint-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => handleAiProviderRequest(req, 'openai');

export const POST = postHandler;
