/*
::neup.documentation::api-ai-direct-googleai-route
::api POST /api/ai/direct/googleai

Routes AI generation requests straight to the Gemini API without Genkit.

::public

Send a JSON body with:
- `model`
- `prompt` or `messages`
- optional `system`
- optional `temperature`
- optional `maxTokens`

Returns:
- `200` on success
- `400` for invalid request bodies
- `502` when the upstream provider call fails
- `503` when server-side provider credentials are missing

::public end

::private

The route keeps provider-specific logic in `services/ai/provider-endpoint-service.ts`.

::private end

::end
*/

import type { NextRequest } from 'next/server';
import { handleAiProviderRequest } from '@/services/ai/provider-endpoint-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => handleAiProviderRequest(req, 'googleai');

export const POST = withRequestDevLog({ source: 'api', name: 'api/ai/direct/googleai:POST' }, postHandler);
