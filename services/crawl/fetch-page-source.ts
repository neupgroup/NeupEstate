'use server';

import { logProblem } from '@/services/problem-service';

export async function fetchPageSourceCode(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Could not read error response body.');
            const error = new Error(`Request to ${url} failed with status: ${response.status} ${response.statusText}`);
            await logProblem(error, 'fetchPageSourceCode (HTTP Error)', {
                request: { url, method: 'GET' },
                response: { status: response.status, statusText: response.statusText, body: errorBody },
            });
            throw error;
        }

        return await response.text();
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('failed with status')) {
            await logProblem(error, 'fetchPageSourceCode (Network/Other Error)', {
                request: { url, method: 'GET' },
                response: 'No response received.',
            });
        }
        throw error;
    }
}
