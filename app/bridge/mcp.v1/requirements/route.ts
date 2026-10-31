/*
::neup.documentation::mcp-requirements-endpoint
::api POST|GET|DELETE /bridge/mcp.v1/requirements

::public

This stateless MCP Streamable HTTP endpoint exposes tools to create a
requirement for the authenticated account and list that account's requirements.
Send a valid Neup auth token in the `x-auth` header on every MCP request.

::public end
::end
*/
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { prisma } from '@neup/core/database/prisma';
import { logica } from '@neup/logica';
import { z } from 'zod';
import { CreateRequirementSchema } from '@/types/requirements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requirementInputSchema = {
  purpose: CreateRequirementSchema.shape.purpose.describe('Purchase, rent, lease, or exchange purpose.'),
  propertyType: CreateRequirementSchema.shape.propertyType.describe('Property categories requested.'),
  minBudget: z.number().nonnegative().optional().describe('Minimum budget.'),
  maxBudget: z.number().nonnegative().optional().describe('Maximum budget.'),
  location: z.string().trim().optional().describe('Requested location.'),
  paymentMethod: CreateRequirementSchema.shape.paymentMethod.describe('Accepted payment methods.'),
  requiredTime: CreateRequirementSchema.shape.requiredTime.describe('When the property is needed.'),
  urgency: CreateRequirementSchema.shape.urgency.describe('Requirement urgency.'),
  loan: z.boolean().optional().describe('Whether loan support is required.'),
};

/* Creates the requirement MCP tools scoped to the verified account. */
function createRequirementsMcpServer(actorAccountId: string): McpServer {
  const server = new McpServer(
    { name: 'neupestate-requirements', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      instructions: 'Create requirements for the authenticated account and list only that account’s requirements. The account is determined by x-auth.',
    },
  );

  server.registerTool(
    'create_requirement',
    {
      title: 'Create requirement',
      description: 'Creates a property requirement for the authenticated account. All requirement fields are optional; the account owner is assigned from authentication.',
      inputSchema: requirementInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (input) => {
      try {
        const parsed = CreateRequirementSchema.safeParse(input);
        if (!parsed.success) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid requirement.', details: parsed.error.flatten().fieldErrors }) }], isError: true };
        }

        const requirement = await prisma.requirement.create({
          data: { ...parsed.data, userId: actorAccountId },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(requirement) }],
          structuredContent: requirement,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create requirement.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  server.registerTool(
    'list_my_requirements',
    {
      title: 'List my requirements',
      description: 'Lists requirements belonging to the authenticated account, newest first. Supports limit (default 25, maximum 100) and offset (default 0).',
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(25).describe('Maximum number of requirements to return.'),
        offset: z.number().int().min(0).default(0).describe('Number of newest requirements to skip.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit, offset }) => {
      try {
        const [requirements, total] = await Promise.all([
          prisma.requirement.findMany({
            where: { userId: actorAccountId },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.requirement.count({ where: { userId: actorAccountId } }),
        ]);
        const response = {
          data: requirements,
          pagination: { limit, offset, total, hasMore: offset + requirements.length < total },
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(response) }],
          structuredContent: response,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list requirements.';
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  return server;
}

/* Verifies the required x-auth token and returns its authenticated account ID. */
async function getVerifiedActorAccountId(request: Request): Promise<string | null> {
  const token = request.headers.get('x-auth')?.trim();
  if (!token) return null;

  try {
    const verification = await logica.account.auth.verify(token);
    if (!verification?.valid) return null;
    const actorAccountId = verification.payload?.aid;
    return typeof actorAccountId === 'string' && actorAccountId.trim() ? actorAccountId.trim() : null;
  } catch {
    return null;
  }
}

/* Handles one stateless MCP Streamable HTTP request. */
async function handleRequirementsMcpRequest(request: Request): Promise<Response> {
  const actorAccountId = await getVerifiedActorAccountId(request);
  if (!actorAccountId) {
    return Response.json({ error: 'Unauthorized. Provide a valid Neup auth token in the x-auth header.' }, { status: 401 });
  }

  const server = createRequirementsMcpServer(actorAccountId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleRequirementsMcpRequest;
export const POST = handleRequirementsMcpRequest;
export const DELETE = handleRequirementsMcpRequest;
