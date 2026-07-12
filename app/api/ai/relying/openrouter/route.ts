/*
::neup.documentation::api-ai-relying-openrouter-route
::api POST /api/ai/relying/openrouter

Routes AI generation requests through OpenRouter.

::public

Accepts the shared AI JSON request shape used by the direct provider routes and returns normalized text plus the raw OpenRouter response.

::public end

::private

The route is separate from the direct providers because OpenRouter is an upstream relay rather than the model vendor itself.

::private end

::end
*/

import type { NextRequest } from 'next/server';
import { handleAiProviderRequest } from '@/services/ai/provider-endpoint-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => handleAiProviderRequest(req, 'openrouter');

export const POST = withRequestDevLog({ source: 'api', name: 'api/ai/relying/openrouter:POST' }, postHandler);
