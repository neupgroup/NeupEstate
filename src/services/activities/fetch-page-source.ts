// src/services/fetch-page-source.ts
'use server';

/**
 * Fetches the raw HTML source code of a given URL.
 * It simulates a real browser with a User-Agent header.
 * @param url The URL of the page to fetch.
 * @returns The HTML content as a string.
 */
export async function fetchPageSource(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            cache: 'no-store', // Ensure we always get the latest version
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`Request to ${url} failed with status: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        return html;
    } catch (e: any) {
        console.error(`Error in fetchPageSource for ${url}:`, e.message);
        // Re-throw or return an error message so the calling function can handle it.
        return `Failed to fetch HTML content from ${url}. Error: ${e.message}`;
    }
}
