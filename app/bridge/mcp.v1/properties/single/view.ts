import { z } from 'zod';
import { getProperty } from '@/services/properties/single/get';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

/* Registers a tool that retrieves one approved property by ID or public code. */
export function registerViewPropertyTool(server: McpToolServer): void {
  server.registerTool('view_property', {
    title: 'View property', description: 'Returns one approved property by propertyId or propertyCode. If both are provided, propertyId takes precedence.',
    inputSchema: { propertyId: z.string().trim().min(1).optional(), propertyCode: z.string().trim().min(1).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ propertyId, propertyCode }) => {
    try {
      if (!propertyId && !propertyCode) return mcpError('Provide propertyId or propertyCode.');
      const property = await getProperty({ propertyId, propertyCode });
      if (!property) return mcpError('Property not found.');
      return mcpSuccess({ data: property });
    } catch (error) { return mcpError(error, 'Failed to view property.'); }
  });
}
