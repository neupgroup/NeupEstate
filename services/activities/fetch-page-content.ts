'use server';

/**
 * @fileOverview A shared helper for fetching HTML content from a URL.
 */

import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export async function fetchPageContent({ url }: { url: string }): Promise<string> {
    return fetchPageSourceCode(url);
}
