'use server';

import { z } from 'zod';
import * as cheerio from 'cheerio';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { logProblem } from '@/services/problem-service';
import { generateText } from '@/services/ai/unified-generation-service';

const ExtractCompetitorListingInputSchema = z.object({
  url: z.string().url(),
});

export type ExtractCompetitorListingInput = z.infer<typeof ExtractCompetitorListingInputSchema>;

const ExtractCompetitorListingOutputSchema = z.object({
  isPropertyPage: z.boolean(),
  title: z.string().optional(),
  description: z.string().optional(),
  purpose: z.enum(['rental', 'sales']).optional(),
  agentName: z.string().optional(),
  price: z.union([z.number(), z.string(), z.record(z.any())]).optional(),
  priceBasis: z.string().optional(),
  isSold: z.boolean().optional(),
  details: z.record(z.any()).optional(),
});

export type ExtractCompetitorListingOutput = z.infer<typeof ExtractCompetitorListingOutputSchema>;

const PROMPT_TEXT = `You are an expert real estate listing parser.

You will receive:
- prompt: the task instructions
- context: the rendered page text and extracted page metadata
- images: a list of image URLs extracted from the page source

Your job:
1. Decide whether the page is a single property detail page.
2. If it is, return structured JSON with:
   - title
   - description
   - purpose: exactly "rental" or "sales"
   - agentName if visible
   - price
   - priceBasis
   - isSold
   - details as a JSON object for everything else useful

Rules:
- Do not use the page URL as an input signal.
- Do not guess.
- If this is not a single property page, return isPropertyPage: false and omit the rest.
- Keep the response strictly in JSON.
`;

const promptText = `{{{prompt}}}

Context:
{{{context}}}

Images:
{{#each images}}
- {{{this}}}
{{/each}}
`;

function buildRenderedContext(html: string, baseUrl: string): { context: string; images: string[] } {
  const $ = cheerio.load(html);

  $('script, style, noscript, template, svg, canvas, iframe').remove();

  const images = new Set<string>();
  $('img').each((_, el) => {
    const attrs = [
      $(el).attr('src'),
      $(el).attr('data-src'),
      $(el).attr('data-lazy'),
      $(el).attr('data-original'),
    ].filter(Boolean) as string[];

    for (const value of attrs) {
      try {
        const resolved = new URL(value, baseUrl).href;
        images.add(resolved);
      } catch {
        // Ignore malformed URLs.
      }
    }
  });

  const contextParts: string[] = [];
  const title = $('title').text().trim();
  if (title) contextParts.push(`Title: ${title}`);

  const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  if (headings.length > 0) contextParts.push(`Headings: ${headings.join(' | ')}`);

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  if (bodyText) contextParts.push(`Body: ${bodyText}`);

  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  if (metaDescription) contextParts.push(`Meta description: ${metaDescription}`);

  return { context: contextParts.join('\n'), images: Array.from(images) };
}

export async function extractCompetitorListing(input: ExtractCompetitorListingInput): Promise<ExtractCompetitorListingOutput> {
  try {
    const html = await fetchPageSourceCode(input.url);
    const { context, images } = buildRenderedContext(html, input.url);
    const output = await generateText<ExtractCompetitorListingOutput>({
      model: 'gemini-2.5-flash-lite',
      promptText,
      inputData: {
        prompt: PROMPT_TEXT,
        context,
        images,
      },
      outputSchema: ExtractCompetitorListingOutputSchema,
    });

    return output;
  } catch (error) {
    await logProblem(error, 'extractCompetitorListing');
    throw error;
  }
}
