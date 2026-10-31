/*
::neup.documentation::mcp-endpoint
::api POST|GET|DELETE /bridge/mcp.v1/

::public

This stateless MCP Streamable HTTP endpoint exposes property creation,
requirement management, lead viewing, and property search tools. Send a valid
Neup auth token in the `x-auth` header on every request.

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
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { submitPropertyCreation } from '@/services/properties/create';
import { getPaginatedProperties } from '@/services/properties/list';
import type { CreatePropertyFormValues } from '@/types';
import { CreateRequirementSchema } from '@/types/requirements';
import { PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema } from '@/types/property';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const propertyCreationRequirements = {
  requiredFields: ['title', 'description', 'categories', 'types', 'area', 'bedrooms', 'bathrooms'],
  purpose: 'Provide purpose or purposes; at least one purpose is required.',
  pricing: 'When pricing.priceDisplayMode is show-price, provide at least one positive price.',
  workflow: 'Collect the fields conversationally, then submit the complete property object once.',
};

const requirementInputSchema = {
  purpose: CreateRequirementSchema.shape.purpose.describe('Purchase, rent, lease, or exchange purpose.'),
  propertyType: CreateRequirementSchema.shape.propertyType.describe('Requested property categories.'),
  minBudget: z.number().nonnegative().optional(),
  maxBudget: z.number().nonnegative().optional(),
  location: z.string().trim().optional(),
  paymentMethod: CreateRequirementSchema.shape.paymentMethod,
  requiredTime: CreateRequirementSchema.shape.requiredTime,
  urgency: CreateRequirementSchema.shape.urgency,
  loan: z.boolean().optional(),
};

/* Determines whether the authenticated account can see all leads. */
async function canViewAllLeads(actorAccountId: string): Promise<boolean> {
  const [account, agencyLinks] = await Promise.all([
    getAccountById(actorAccountId),
    getAgencyAgentMapsByAgent(actorAccountId),
  ]);
  return ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
    || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
}

/* Creates the unified MCP server and registers every supported tool. */
function createMcpServer(actorAccountId: string): McpServer {
  const server = new McpServer({ name: 'neupestate', version: '1.0.0' }, {
    capabilities: { tools: {} },
    instructions: 'Use these tools to submit property drafts, manage the authenticated account’s requirements, view leads permitted to that account, and search active properties. Authentication uses the x-auth header.',
  });

  server.registerTool('property_creation_requirements', {
    title: 'Get property creation requirements',
    description: 'Returns required fields and business rules for property submission.',
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => ({ content: [{ type: 'text', text: JSON.stringify(propertyCreationRequirements, null, 2) }], structuredContent: propertyCreationRequirements }));

  server.registerTool('submit_property_creation', {
    title: 'Submit property for review',
    description: 'Validates a complete property payload and creates or refreshes the authenticated account’s awaiting-review property draft.',
    inputSchema: {
      property: z.record(z.unknown()).describe('Complete property form payload.'),
      workingProfileId: z.string().trim().min(1).optional().describe('Optional accessible agency or working profile ID.'),
    }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ property, workingProfileId }) => {
    try {
      if (!(await hasPermission(PERMISSIONS.manage.propertySelfCreate))) throw new Error('Permission denied: property creation is not allowed for this account.');
      const result = await submitPropertyCreation(property as CreatePropertyFormValues, { actorAccountId, workingProfileId });
      const response = { success: true, requestId: result.requestId, status: 'awaiting review' };
      return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response };
    } catch (error) { return toolError(error, 'Failed to create property draft.'); }
  });

  server.registerTool('create_requirement', {
    title: 'Create requirement',
    description: 'Creates a property requirement for the authenticated account. All requirement fields are optional; ownership comes from authentication.',
    inputSchema: requirementInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input) => {
    try {
      const parsed = CreateRequirementSchema.safeParse(input);
      if (!parsed.success) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid requirement.', details: parsed.error.flatten().fieldErrors }) }], isError: true };
      const requirement = await prisma.requirement.create({ data: { ...parsed.data, userId: actorAccountId } });
      return { content: [{ type: 'text', text: JSON.stringify(requirement) }], structuredContent: requirement };
    } catch (error) { return toolError(error, 'Failed to create requirement.'); }
  });

  server.registerTool('list_my_requirements', {
    title: 'List my requirements',
    description: 'Lists the authenticated account’s requirements, newest first.',
    inputSchema: { limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      const where = { userId: actorAccountId };
      const [data, total] = await Promise.all([
        prisma.requirement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.requirement.count({ where }),
      ]);
      const response = { data, pagination: { limit, offset, total, hasMore: offset + data.length < total } };
      return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response };
    } catch (error) { return toolError(error, 'Failed to list requirements.'); }
  });

  server.registerTool('list_leads', {
    title: 'List leads',
    description: 'Lists shared leads assigned to the authenticated account, or all leads for an agency account or agency administrator. Requires self-lead view permission.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      const where = await canViewAllLeads(actorAccountId) ? {} : { owner: actorAccountId };
      const [leads, total] = await Promise.all([
        prisma.sharedLeads.findMany({ where, include: { baseLead: { include: { contacts: true } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.sharedLeads.count({ where }),
      ]);
      const data = leads.map(({ baseLead, ...lead }) => {
        const legacy = baseLead.contact && typeof baseLead.contact === 'object' ? baseLead.contact as Record<string, unknown> : {};
        const pick = (type: string, fallback: unknown) => baseLead.contacts.find((entry) => entry.type.toLowerCase() === type)?.value ?? fallback ?? null;
        return { ...lead, client: { ...baseLead, contact: { email: pick('email', legacy.email), phone: pick('phone', legacy.phone) } } };
      });
      const response = { data, pagination: { limit, offset, total, hasMore: offset + data.length < total } };
      return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response };
    } catch (error) { return toolError(error, 'Failed to list leads.'); }
  });

  server.registerTool('list_base_leads', {
    title: 'List base leads',
    description: 'Lists base lead/client records owned by the authenticated account, or all records for an agency account or agency administrator. Requires self-lead view permission.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      const where = await canViewAllLeads(actorAccountId) ? {} : { belongsTo: actorAccountId };
      const [records, total] = await Promise.all([
        prisma.baseLead.findMany({ where, include: { contacts: true, sharedLeads: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.baseLead.count({ where }),
      ]);
      const data = records.map(({ contacts, sharedLeads, contact, ...lead }) => {
        const legacy = contact && typeof contact === 'object' ? contact as Record<string, unknown> : {};
        const pick = (type: string, fallback: unknown) => contacts.find((entry) => entry.type.toLowerCase() === type)?.value ?? fallback ?? null;
        return { ...lead, contact: { email: pick('email', legacy.email), phone: pick('phone', legacy.phone) }, leads: sharedLeads };
      });
      const response = { data, pagination: { limit, offset, total, hasMore: offset + data.length < total } };
      return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response };
    } catch (error) { return toolError(error, 'Failed to list base leads.'); }
  });

  server.registerTool('search_properties', {
    title: 'Search properties',
    description: 'Searches active properties by text, location, purpose, category, usage type, price, and bedrooms. Returns at most 50 properties per page.',
    inputSchema: {
      searchTerm: z.string().trim().max(200).optional(), location: z.string().trim().max(200).optional(),
      purpose: z.array(PropertyPurposeSchema).max(4).optional(), category: z.array(PropertyCategorySchema).max(10).optional(),
      type: z.array(PropertyUsageTypeSchema).max(4).optional(), minPrice: z.number().nonnegative().optional(), maxPrice: z.number().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(), maxBedrooms: z.number().int().nonnegative().optional(),
      page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(20),
    }, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ page, pageSize, ...filters }) => {
    try {
      const result = await getPaginatedProperties({ filters, page, limit: pageSize });
      const response = { data: result.properties, pagination: { page, pageSize, total: result.totalCount, hasMore: page * pageSize < result.totalCount }, appliedFilters: filters };
      return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response };
    } catch (error) { return toolError(error, 'Failed to search properties.'); }
  });

  return server;
}

/* Converts a tool failure into an MCP error result. */
function toolError(error: unknown, fallback: string) {
  return { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : fallback }], isError: true as const };
}

/* Checks property creation permission for the authenticated actor. */
async function hasPermission(permission: string): Promise<boolean> {
  try { await requirePermission(permission); return true; } catch { return false; }
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
  const server = createMcpServer(actorAccountId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
