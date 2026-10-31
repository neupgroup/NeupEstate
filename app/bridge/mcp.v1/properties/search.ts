import { z } from 'zod';
import { PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema } from '@/types/property';
import { getPaginatedProperties } from '@/services/properties/list';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a bounded search tool for active property listings. */
export function registerSearchPropertiesTool(server: McpToolServer): void {
  server.registerTool('search_properties', {
    title: 'Search properties', description: 'Searches active listings by text, location, purpose, category, usage type, price, and bedroom count.',
    inputSchema: {
      searchTerm: z.string().trim().max(200).optional(), location: z.string().trim().max(200).optional(),
      purpose: z.array(PropertyPurposeSchema).max(4).optional(), category: z.array(PropertyCategorySchema).max(10).optional(),
      type: z.array(PropertyUsageTypeSchema).max(4).optional(), minPrice: z.number().nonnegative().optional(), maxPrice: z.number().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(), maxBedrooms: z.number().int().nonnegative().optional(),
      page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(20),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ page, pageSize, ...filters }) => {
    try {
      const result = await getPaginatedProperties({ filters, page, limit: pageSize });
      return mcpSuccess({ data: result.properties, pagination: { page, pageSize, total: result.totalCount, hasMore: page * pageSize < result.totalCount }, appliedFilters: filters });
    } catch (error) { return mcpError(error, 'Failed to search properties.'); }
  });
}
