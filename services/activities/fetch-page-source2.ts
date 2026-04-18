'use server';

import { logProblem } from "@/services/problem-service";

/**
 * Fetches the raw HTML source code of a given URL.
 * It simulates a real browser with a User-Agent header.
 * @param url The URL of the page to fetch.
 * @returns The HTML content as a string.
 * @throws Will throw an error if the fetch fails, after logging the problem.
 */
export async function fetchPageSourceCode(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Could not read error response body.');
            const error = new Error(`Request to ${url} failed with status: ${response.status} ${response.statusText}`);
            
            await logProblem(error, `fetchPageSourceCode (HTTP Error)`, {
                request: { url: url, method: 'GET' },
                response: { status: response.status, statusText: response.statusText, body: errorBody }
            });
            
            throw error;
        }

        return await response.text();
    } catch (e: any) {
        // This will catch network errors or the re-thrown error from above.
        // If it's the re-thrown error, we don't want to log it again.
        if (!e.message.includes('failed with status')) {
             await logProblem(e, `fetchPageSourceCode (Network/Other Error)`, {
                request: { url: url, method: 'GET' },
                response: 'No response received.'
            });
        }
        
        // Re-throw the error to be handled by the calling function.
        // We no longer return a string, we always throw on error.
        throw e;
    }
}
