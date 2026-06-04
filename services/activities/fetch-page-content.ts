'use server';

/**
 * @fileOverview A shared Genkit tool for fetching HTML content from a URL.
 */

import { ai } from '@/logica/core/ai/genkit';
import { z } from 'zod';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export const fetchPageContent = ai.defineTool(
    {
        name: 'fetchPageContent',
        description: 'Fetches the full HTML source code of a given URL.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.string(),
    },
    async ({ url }) => {
        return fetchPageSourceCode(url);
    }
);
