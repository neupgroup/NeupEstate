/*
::neup.documentation::mcp-properties-endpoint
::api POST|GET|DELETE /bridge/mcp.v1/properties

::public

This stateless MCP Streamable HTTP endpoint exposes property creation tools.
Clients initialize the MCP connection and list tools at this URL, then call
`property_creation_requirements` to guide a multi-step conversation and
`submit_property_creation` after collecting a complete property payload.
Submission creates or refreshes an awaiting-review draft and returns its
requestId. Provide accountId and property data to the submit tool; an optional
workingProfileId selects an accessible posting profile.

::public end

::private

Each request gets a fresh MCP server and stateless Streamable HTTP transport.
Property validation, posting-profile access, and draft persistence are handled
by the existing property creation service.

::private end
::end
*/
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { submitPropertyCreation } from '@/services/properties/create';
import type { CreatePropertyFormValues } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const propertyCreationRequirements = {
  requiredFields: ['title', 'description', 'categories', 'types', 'area', 'bedrooms', 'bathrooms'],
  purpose: 'Provide purpose or purposes; at least one purpose is required.',
  pricing: 'When pricing.priceDisplayMode is show-price, provide at least one positive price.',
  workflow: 'Collect these fields over as many conversational steps as needed, then submit the complete property object once.',
};

/* Creates a property scoped MCP server with the property creation tools. */
function createPropertiesMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'neupestate-properties', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      instructions: 'Help users gather the required property details conversationally. Submit only after collecting the complete property payload and accountId.',
    },
  );

  server.registerTool(
    'property_creation_requirements',
    {
      title: 'Get property creation requirements',
      description: 'Returns the required fields and business rules for a property submission. Use this to guide a multi-step conversation before submission.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(propertyCreationRequirements, null, 2) }],
      structuredContent: propertyCreationRequirements,
    }),
  );

  server.registerTool(
    'submit_property_creation',
    {
      title: 'Submit property for review',
      description: 'Validates a complete property payload and creates or refreshes the account’s awaiting-review property draft. First collect the required property details, accountId, and optional accessible workingProfileId. The property object uses the property creation form fields: title, description, purpose or purposes, categories, types, area, bedrooms, bathrooms, and optional pricing, location, images, ownership, and property-specific details.',
      inputSchema: {
        accountId: z.string().trim().min(1).describe('Account ID that owns this property creation request.'),
        property: z.record(z.unknown()).describe('Complete property form payload. It is validated against the application property creation schema.'),
        workingProfileId: z.string().trim().min(1).optional().describe('Optional agency or working profile ID the account is authorized to use.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ accountId, property, workingProfileId }) => {
      try {
        const result = await submitPropertyCreation(property as CreatePropertyFormValues, {
          actorAccountId: accountId,
          workingProfileId,
        });
        const response = { success: true, requestId: result.requestId, status: 'awaiting review' };
        return {
          content: [{ type: 'text', text: JSON.stringify(response) }],
          structuredContent: response,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create property draft.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  return server;
}

/* Handles one stateless MCP Streamable HTTP request. */
async function handlePropertiesMcpRequest(request: Request): Promise<Response> {
  const server = createPropertiesMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handlePropertiesMcpRequest;
export const POST = handlePropertiesMcpRequest;
export const DELETE = handlePropertiesMcpRequest;
