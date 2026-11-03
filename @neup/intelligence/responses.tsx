'use server';

import { z } from 'zod';

const NIA_RESPONSES_URL = 'https://neupgroup.com/assist/bridge/api.v1/responses';

const NiaInputItemSchema = z.object({
  type: z.literal('text'),
  role: z.enum(['system', 'developer', 'user']),
  text: z.string().min(1),
});

const NiaResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    createdAt: z.string(),
    output: z.array(z.object({
      type: z.literal('text'),
      value: z.string(),
    })),
  }),
});

export type NiaInputItem = z.infer<typeof NiaInputItemSchema>;
export type NiaResponse = z.infer<typeof NiaResponseSchema>;

export type CreateNiaResponseInput = {
  input: NiaInputItem[];
  model?: string;
  failover?: boolean;
  stream?: boolean;
};

// Read the Nia API key at request time so server runtime configuration is respected.
function getNiaApiKey(): string {
  const apiKey = process.env.NIA_INTELLIGENCE_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing NIA_INTELLIGENCE_KEY environment variable.');
  }
  return apiKey;
}

// Send a text conversation to Nia and validate the documented response envelope.
export async function createNiaResponse(input: CreateNiaResponseInput): Promise<NiaResponse> {
  const requestInput = z.array(NiaInputItemSchema).min(1).parse(input.input);
  const response = await fetch(NIA_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'x-token': getNiaApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model?.trim() || 'auto',
      failover: input.failover ?? true,
      stream: input.stream ?? false,
      input: requestInput,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText) as unknown;
  } catch {
    payload = responseText;
  }
  console.dir({
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: payload,
  }, {
    depth: null,
    maxArrayLength: null,
    maxStringLength: null,
    compact: false,
  });

  if (!response.ok) {
    const responseDetails = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Nia request failed (HTTP ${response.status}): ${responseDetails}`);
  }

  const parsedResponse = NiaResponseSchema.safeParse(payload);
  if (!parsedResponse.success) {
    throw new Error('Nia returned a response with an invalid format.');
  }

  return parsedResponse.data;
}
