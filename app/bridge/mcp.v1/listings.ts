/*
::neup.documentation::mcp-property-tools
::public

Registers property-related tools on the shared MCP server. This module is not
a route; import `registerPropertyTools` from the root MCP endpoint when ready.
Property search returns active listings. Saved-property results are limited to
the authenticated account supplied by the caller.

::public end
::end
*/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ListingPurposeSchema, ListingCategorySchema, ListingUsageTypeSchema } from '@/types/listing';
import { getPaginatedListings, getListingsSaved } from '@/services/listings/list';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { prisma } from '@neup/core/database/prisma';
import { mcpSuccess } from './_shared';

/* Registers property search and saved-property tools on the shared MCP server. */
export function registerListingTools(server: McpServer, actorAccountId: string, format?: string): void {
  server.registerTool('search_listings', {
    title: 'Search properties',
    description: 'Searches active properties by text, location, purpose, category, usage type, price, and bedroom count. Returns at most 50 results per page.',
    inputSchema: {
      searchTerm: z.string().trim().max(200).optional().describe('Text matched against title, description, or location.'),
      location: z.string().trim().max(200).optional(),
      purpose: z.array(ListingPurposeSchema).max(4).optional(),
      category: z.array(ListingCategorySchema).max(10).optional(),
      type: z.array(ListingUsageTypeSchema).max(4).optional(),
      minPrice: z.number().nonnegative().optional(),
      maxPrice: z.number().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(),
      maxBedrooms: z.number().int().nonnegative().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ page, pageSize, ...filters }) => {
    try {
      const result = await getPaginatedListings({ filters, page, limit: pageSize });
      return mcpSuccess({
        data: result.listings,
        pagination: {
          page,
          pageSize,
          total: result.totalCount,
          hasMore: page * pageSize < result.totalCount,
        },
        appliedFilters: filters,
      }, format);
    } catch (error) {
      return toolFailure(error, 'Failed to search properties.');
    }
  });

  server.registerTool('list_my_saved_properties', {
    title: 'List my saved properties',
    description: 'Lists active properties saved by the authenticated account, newest saved first. Requires property save permission. Maximum 100 results per page.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.public.propertySave);
      const where = { accountId: actorAccountId };
      const [data, total] = await Promise.all([
        getListingsSaved(actorAccountId, offset, limit),
        prisma.savedProperty.count({ where }),
      ]);
      return mcpSuccess({
        data,
        pagination: { limit, offset, total, hasMore: offset + data.length < total },
      }, format);
    } catch (error) {
      return toolFailure(error, 'Failed to list saved properties.');
    }
  });
}

/* Converts a thrown search or permission failure into an MCP tool error. */
function toolFailure(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}
