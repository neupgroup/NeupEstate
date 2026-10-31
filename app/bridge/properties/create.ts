/*
::neup.documentation::mcp-property-create-tool
::public

Registers the property creation MCP tool on a shared MCP server. The
authenticated account ID must come from the caller's verified `x-auth` token.
Successful submissions create or refresh an awaiting-review draft and return
its request ID.

::public end
::end
*/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { submitPropertyCreation } from '@/services/properties/create';
import { CreatePropertySchema, type CreatePropertyFormValues } from '@/types';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

/* Registers the property draft creation tool for the authenticated account. */
export function registerPropertyCreateTool(server: McpServer, actorAccountId: string): void {
  server.registerTool('create_property', {
    title: 'Create property draft',
    description: 'Validates the complete property form and creates or refreshes the authenticated account’s awaiting-review draft. Collect the required property details before submitting.',
    inputSchema: {
      property: z.record(z.unknown()).describe('Complete property form payload. Required fields and business rules are validated by the application.'),
      workingProfileId: z.string().trim().min(1).optional().describe('Optional agency or working profile the account is authorized to use.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ property, workingProfileId }) => {
    try {
      await requirePermission(PERMISSIONS.manage.propertySelfCreate);
      const parsed = CreatePropertySchema.safeParse(property);
      if (!parsed.success) {
        return toolError(JSON.stringify({ error: 'Invalid property.', details: parsed.error.flatten().fieldErrors }));
      }
      const result = await submitPropertyCreation(parsed.data as CreatePropertyFormValues, {
        actorAccountId,
        workingProfileId,
      });
      const response = { success: true, requestId: result.requestId, status: 'awaiting review' };
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        structuredContent: response,
      };
    } catch (error) {
      return toolFailure(error, 'Failed to create property draft.');
    }
  });
}

/* Returns a validation or service error in the MCP tool result. */
function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

/* Converts thrown permission and service errors into an MCP tool error. */
function toolFailure(error: unknown, fallback: string) {
  return toolError(error instanceof Error ? error.message : fallback);
}
