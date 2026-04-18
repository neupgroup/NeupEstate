import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const DEFAULT_MODEL_NAME = 'gemini-2.5-flash';
export const DEFAULT_EMBEDDER_NAME = 'gemini-embedding-001';

function stripGoogleModelPrefix(identifier: string): string {
  return identifier.startsWith('googleai/') ? identifier.slice('googleai/'.length) : identifier;
}

export function resolveGoogleModel(identifier?: string) {
  return googleAI.model(stripGoogleModelPrefix(identifier?.trim() || DEFAULT_MODEL_NAME));
}

// By not passing an API key, Genkit will use Application Default Credentials,
// which is required for Vertex AI models.
export const ai = genkit({
  plugins: [googleAI()],
  model: resolveGoogleModel(),
});

// Shared embedding model reference used by database adapters.
export const embedder = googleAI.embedder(DEFAULT_EMBEDDER_NAME);

export {googleAI};
