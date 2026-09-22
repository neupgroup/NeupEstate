'use server';

import { fetchPageSourceCode } from './fetch-page-source';

export async function fetchPageContent({ url }: { url: string }): Promise<string> {
    return fetchPageSourceCode(url);
}
