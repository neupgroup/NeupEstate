/*
::neup.documentation::mcp-endpoint
::api POST|GET|DELETE /bridge/mcp.v1/

::public

Stateless MCP endpoint for lead activity, saved properties, team leads, and
account, agent, and agency listings. Every request requires a valid Neup auth
token in the `x-auth` header.

::public end
::end
*/
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { prisma } from '@neup/core/database/prisma';
import { logica } from '@neup/logica';
import { z } from 'zod';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { getAgents, getAgentCount } from '@/services/agents/agent/service';
import { getPublicAgencyAccounts, getPublicAgencyAccountCount } from '@/services/agencies/agency/service';
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { registerListingTools } from './listings';
import { registerViewListingTool } from './listings/single/view';
import { registerAddListingTool } from './listings/addListing';
import { registerListingUpdateTool } from '../listings/update';
import { registerVisitRequestTools } from './listings/visitRequests';
import { registerAddLeadTool } from './leads/add';
import { registerViewMineTool } from './leads/view_mine';
import { registerViewMyTeamTool } from './leads/view_myTeam';
import { registerViewMyOrganizationTool } from './leads/view_myOrganization';
import { registerViewActivityTool } from './leads/single/viewActivity';
import { registerAddActivityTool } from './leads/single/addActivity';
import { registerTransferLeadTool } from './leads/single/transfer';
import { registerViewLeadTool } from './leads/single/view';
import { getMcpFormat } from './_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const paginationInput = {
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
};

/* Applies the same agency-admin visibility used by the bridge lead endpoints. */
async function canViewAllTeamLeads(actorAccountId: string): Promise<boolean> {
  const [account, agencyLinks] = await Promise.all([
    getAccountById(actorAccountId),
    getAgencyAgentMapsByAgent(actorAccountId),
  ]);
  return ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
    || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
}

/* Creates the MCP server and registers account-scoped listing and lead tools. */
function createMcpServer(actorAccountId: string, format?: string): McpServer {
  const server = new McpServer({ name: 'neupestate', version: '1.0.0' }, {
    capabilities: { tools: {} },
    instructions: 'Add activities to leads the authenticated account can access; view its saved properties and team leads; and browse platform accounts, agents, and agencies. The account is determined by x-auth.',
  });

  server.registerTool('list_team_leads', {
    title: 'List my team leads',
    description: 'Lists shared leads assigned to the authenticated account. Agency accounts and agency administrators see all leads under the existing team visibility rules. Maximum 25 per page.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.crm.lead.view);
      const where = await canViewAllTeamLeads(actorAccountId) ? {} : { owner: actorAccountId };
      const [data, total] = await Promise.all([
        prisma.leadsAssigned.findMany({ where, include: { baseLead: { include: { contacts: true } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.leadsAssigned.count({ where }),
      ]);
      return toolSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } }, format);
    } catch (error) { return toolFailure(error, 'Failed to list team leads.'); }
  });

  server.registerTool('list_platform_accounts', {
    title: 'List platform accounts',
    description: 'Lists account profiles across the platform. Requires account view permission. Only profile fields are returned; authentication and internal access fields are excluded.',
    inputSchema: paginationInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.accountView);
      const [accounts, total] = await Promise.all([
        prisma.account.findMany({
          orderBy: [{ createdOn: 'desc' }, { id: 'asc' }], skip: offset, take: limit,
          select: { id: true, neupId: true, accountType: true, displayName: true, displayImage: true, createdOn: true },
        }),
        prisma.account.count(),
      ]);
      const data = accounts.map(({ id, neupId, accountType, displayName, displayImage, createdOn }) => ({
        id, neupId, type: accountType, name: displayName, image: displayImage, createdAt: createdOn.toISOString(),
      }));
      return toolSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } }, format);
    } catch (error) { return toolFailure(error, 'Failed to list platform accounts.'); }
  });

  server.registerTool('list_agents', {
    title: 'List agents',
    description: 'Lists public agent profiles. Optional filters: id, name, query, neupId, and agency. Maximum 25 per page.',
    inputSchema: {
      limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0),
      id: z.string().trim().optional(), name: z.string().trim().optional(), query: z.string().trim().optional(),
      neupId: z.string().trim().optional(), agency: z.string().trim().optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset, ...filters }) => {
    try {
      const [data, total] = await Promise.all([getAgents({ limit, offset, filters }), getAgentCount(filters)]);
      return toolSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } }, format);
    } catch (error) { return toolFailure(error, 'Failed to list agents.'); }
  });

  server.registerTool('list_agencies', {
    title: 'List agencies',
    description: 'Lists public agency profiles. Optional filters: id, name, query, neupId, and agent. Maximum 25 per page.',
    inputSchema: {
      limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0),
      id: z.string().trim().optional(), name: z.string().trim().optional(), query: z.string().trim().optional(),
      neupId: z.string().trim().optional(), agent: z.string().trim().optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset, ...filters }) => {
    try {
      const [data, total] = await Promise.all([
        getPublicAgencyAccounts({ limit, offset, filters }),
        getPublicAgencyAccountCount(filters),
      ]);
      return toolSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } }, format);
    } catch (error) { return toolFailure(error, 'Failed to list agencies.'); }
  });

  registerListingTools(server, actorAccountId, format);
  registerViewListingTool(server, format);
  registerAddListingTool(server, actorAccountId, format);
  registerListingUpdateTool(server, actorAccountId, format);
  registerVisitRequestTools(server, actorAccountId, format);
  registerAddLeadTool(server, actorAccountId, format);
  registerViewMineTool(server, actorAccountId, format);
  registerViewMyTeamTool(server, actorAccountId, format);
  registerViewMyOrganizationTool(server, actorAccountId, format);
  registerViewActivityTool(server, actorAccountId, format);
  registerViewLeadTool(server, actorAccountId, format);
  registerAddActivityTool(server, actorAccountId, format);
  registerTransferLeadTool(server, actorAccountId, format);

  return server;
}

/* Formats a successful result as MCP text and structured content. */
function toolSuccess(value: unknown, format?: string) {
  const response = format === undefined ? value : { ...(value as Record<string, unknown>), format };
  return { content: [{ type: 'text' as const, text: JSON.stringify(response) }], structuredContent: response as Record<string, unknown> };
}

/* Formats a validation or visibility error as an MCP tool error. */
function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

/* Converts thrown service or permission failures into a useful tool error. */
function toolFailure(error: unknown, fallback: string) {
  return toolError(error instanceof Error ? error.message : fallback);
}

/* Verifies x-auth and resolves the authenticated account ID. */
async function getVerifiedActorAccountId(request: Request): Promise<string | null> {
  const token = request.headers.get('x-auth')?.trim();
  if (!token) return null;
  try {
    const verification = await logica.account.auth.verify(token);
    const accountId = verification?.payload?.aid;
    return verification?.valid && typeof accountId === 'string' && accountId.trim() ? accountId.trim() : null;
  } catch { return null; }
}

/* Handles one stateless MCP Streamable HTTP request. */
async function handleMcpRequest(request: Request): Promise<Response> {
  const actorAccountId = await getVerifiedActorAccountId(request);
  if (!actorAccountId) return Response.json({ error: 'Unauthorized. Provide a valid Neup auth token in the x-auth header.' }, { status: 401 });
  const server = createMcpServer(actorAccountId, getMcpFormat(request));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
