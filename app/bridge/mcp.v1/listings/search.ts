import { z } from 'zod';
import { ListingPurposeSchema, ListingCategorySchema, ListingUsageTypeSchema } from '@/types/listing';
import { getPaginatedListings } from '@/services/listings/list';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a bounded search tool for active property listings. */
export function registerSearchListingsTool(server: McpToolServer, format?: string): void {
  server.registerTool('search_listings', {
    title: 'Search properties', description: 'Searches active listings by text, location, purpose, category, usage type, price, and bedroom count.',
    inputSchema: {
      searchTerm: z.string().trim().max(200).optional(), location: z.string().trim().max(200).optional(),
      purpose: z.array(ListingPurposeSchema).max(4).optional(), category: z.array(ListingCategorySchema).max(10).optional(),
      type: z.array(ListingUsageTypeSchema).max(4).optional(), minPrice: z.number().nonnegative().optional(), maxPrice: z.number().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(), maxBedrooms: z.number().int().nonnegative().optional(),
      page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(20),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ page, pageSize, ...filters }) => {
    try {
      const result = await getPaginatedListings({ filters, page, limit: pageSize });
      return mcpSuccess({ data: result.listings, pagination: { page, pageSize, total: result.totalCount, hasMore: page * pageSize < result.totalCount }, appliedFilters: filters }, format);
    } catch (error) { return mcpError(error, 'Failed to search properties.'); }
  });
}
