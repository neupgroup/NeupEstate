/*
::neup.documentation::mcp-property-update-tool
::public

Registers the property update MCP tool on a shared MCP server. The property ID
and partial property fields are supplied in the tool input. Edits are saved as
an awaiting-review request and return its request ID.

::public end
::end
*/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { updateProperty } from '@/services/properties/single/update';
import { CreatePropertySchema } from '@/types';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

const propertyUpdateSchema = CreatePropertySchema.partial();

/* Registers the property edit request tool for the authenticated account. */
export function registerPropertyUpdateTool(server: McpServer, actorAccountId: string): void {
  server.registerTool('update_property', {
    title: 'Submit property update',
    description: 'Submits a partial edit for an approved property. The edit is saved for review and returns a request ID. Only properties represented by the authenticated account can be updated.',
    inputSchema: {
      propertyId: z.string().trim().min(1),
      data: z.record(z.unknown()).describe('Partial property form fields to change.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ propertyId, data }) => {
    try {
      await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
      const parsed = propertyUpdateSchema.safeParse(data);
      if (!parsed.success) {
        return toolError(JSON.stringify({ error: 'Invalid property update.', details: parsed.error.flatten().fieldErrors }));
      }

      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          representatives: { some: { representativeId: actorAccountId } },
        },
        select: { id: true },
      });
      if (!property) return toolError('Property not found or not editable by this account.');

      const result = await updateProperty({ propertyId, accountId: actorAccountId, data: parsed.data });
      const response = { success: true, requestId: result.requestId, status: 'awaiting review' };
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        structuredContent: response,
      };
    } catch (error) {
      return toolFailure(error, 'Failed to submit property update.');
    }
  });
}

/* Returns a validation or access error in the MCP tool result. */
function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

/* Converts thrown permission and service errors into an MCP tool error. */
function toolFailure(error: unknown, fallback: string) {
  return toolError(error instanceof Error ? error.message : fallback);
}
