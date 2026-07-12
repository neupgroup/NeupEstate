/*
::neup.documentation::services-ai-provider-endpoint-service
::title AI Provider Endpoint Service

Validates inbound AI API route requests and dispatches them to provider clients.

::public

Route handlers can call `handleAiProviderRequest()` with a provider name and request object to get a normalized JSON response.

Supported providers:
- `googleai`
- `openai`
- `anthropic`
- `openrouter`

::public end

::private

This service owns:
- request body validation
- API key lookup from environment variables
- upstream error normalization
- HTTP status selection for route responses

It keeps transport logic out of `app/api/*` route files.

::private end

::end
*/

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requestAnthropicCompletion } from '@/core/ai/direct/anthropic';
import { requestGoogleAiCompletion, type DirectAiMessage, type DirectAiRequest } from '@/core/ai/direct/googleai';
import { requestOpenAiCompletion } from '@/core/ai/direct/openai';
import { requestOpenRouterCompletion } from '@/core/ai/relying/openrouter';
import { logProblem } from '@/services/problem-service';

type ProviderName = 'googleai' | 'openai' | 'anthropic' | 'openrouter';

type ProviderRequestBody = {
  model?: unknown;
  prompt?: unknown;
  system?: unknown;
  messages?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
};

class AiRequestError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getProviderApiKey(provider: ProviderName): string {
  const value = {
    googleai:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  }[provider];

  if (!value?.trim()) {
    throw new AiRequestError(503, `Missing server configuration for ${provider}.`, { provider });
  }

  return value.trim();
}

function normalizeMessages(body: ProviderRequestBody): DirectAiMessage[] {
  if (Array.isArray(body.messages)) {
    const messages = body.messages.map((message, index) => {
      if (!message || typeof message !== 'object') {
        throw new AiRequestError(400, `messages[${index}] must be an object.`);
      }

      const role = (message as { role?: unknown }).role;
      const content = (message as { content?: unknown }).content;

      if (role !== 'system' && role !== 'user' && role !== 'assistant') {
        throw new AiRequestError(400, `messages[${index}].role must be system, user, or assistant.`);
      }

      if (typeof content !== 'string' || !content.trim()) {
        throw new AiRequestError(400, `messages[${index}].content must be a non-empty string.`);
      }

      return {
        role: role as DirectAiMessage['role'],
        content: content.trim(),
      };
    });

    if (!messages.length) {
      throw new AiRequestError(400, 'messages must contain at least one item.');
    }

    return messages;
  }

  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw new AiRequestError(400, 'Provide either a non-empty prompt or messages array.');
  }

  const messages: DirectAiMessage[] = [];

  if (typeof body.system === 'string' && body.system.trim()) {
    messages.push({ role: 'system', content: body.system.trim() });
  }

  messages.push({ role: 'user', content: body.prompt.trim() });

  return messages;
}

function parseRequestBody(body: ProviderRequestBody, provider: ProviderName): DirectAiRequest {
  if (typeof body.model !== 'string' || !body.model.trim()) {
    throw new AiRequestError(400, 'model is required.');
  }

  const temperature =
    typeof body.temperature === 'number' && Number.isFinite(body.temperature)
      ? body.temperature
      : undefined;

  const maxTokens =
    typeof body.maxTokens === 'number' && Number.isFinite(body.maxTokens)
      ? Math.max(1, Math.floor(body.maxTokens))
      : undefined;

  return {
    apiKey: getProviderApiKey(provider),
    model: body.model.trim(),
    messages: normalizeMessages(body),
    temperature,
    maxTokens,
  };
}

async function readJsonBody(req: NextRequest): Promise<ProviderRequestBody> {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AiRequestError(400, 'Request body must be a JSON object.');
    }

    return body as ProviderRequestBody;
  } catch (error) {
    if (error instanceof AiRequestError) {
      throw error;
    }

    throw new AiRequestError(400, 'Invalid JSON body.');
  }
}

export async function handleAiProviderRequest(
  req: NextRequest,
  provider: ProviderName,
): Promise<Response> {
  try {
    const body = await readJsonBody(req);
    const request = parseRequestBody(body, provider);

    const result =
      provider === 'googleai'
        ? await requestGoogleAiCompletion(request)
        : provider === 'openai'
          ? await requestOpenAiCompletion(request)
          : provider === 'anthropic'
            ? await requestAnthropicCompletion(request)
            : await requestOpenRouterCompletion(request);

    return NextResponse.json(
      {
        success: true,
        provider,
        model: request.model,
        text: result.text,
        raw: result.raw,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AiRequestError) {
      return NextResponse.json(
        {
          success: false,
          provider,
          error: error.message,
          details: error.details,
        },
        { status: error.status },
      );
    }

    await logProblem(error, `services/ai/provider-endpoint-service:${provider}`);

    return NextResponse.json(
      {
        success: false,
        provider,
        error: 'AI provider request failed.',
      },
      { status: 502 },
    );
  }
}
