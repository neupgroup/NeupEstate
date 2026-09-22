'use server';

import { logger } from "@neup/logica/logger";

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
            await logger().type('fetchPageSourceCode (HTTP Error)').data({ error: String(error), details: {
                request: { url, method: 'GET' },
                response: { status: response.status, statusText: response.statusText, body: errorBody },
            } }).log();
            throw error;
        }

        return await response.text();
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('failed with status')) {
            await logger().type('fetchPageSourceCode (Network/Other Error)').data({ error: String(error), details: {
                request: { url, method: 'GET' },
                response: 'No response received.',
            } }).log();
        }
        throw error;
    }
}
