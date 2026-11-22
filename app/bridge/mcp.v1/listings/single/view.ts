import { z } from 'zod';
import { getListing } from '@/services/listings/single/get';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

/* Registers a tool that retrieves one approved property by ID or public code. */
export function registerViewListingTool(server: McpToolServer, format?: string): void {
  server.registerTool('view_listing', {
    title: 'View property', description: 'Returns one approved property by canonical slug--id identifier or propertyCode. If both are provided, slug takes precedence.',
    inputSchema: { slug: z.string().trim().min(1).optional(), propertyCode: z.string().trim().min(1).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ slug, propertyCode }) => {
    try {
      if (!slug && !propertyCode) return mcpError('Provide slug or propertyCode.');
      const property = await getListing({ slug, propertyCode });
      if (!property) return mcpError('Property not found.');
      return mcpSuccess({ data: property }, format);
    } catch (error) { return mcpError(error, 'Failed to view property.'); }
  });
}
