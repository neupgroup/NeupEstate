import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// By not passing an API key, Genkit will use Application Default Credentials,
// which is required for Vertex AI models.
// We are hardcoding a default model for the entire application for debugging.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash-latest', // Hardcoded default model
});

// Export the googleAI plugin object so other files can use googleAI.model()
export {googleAI};
