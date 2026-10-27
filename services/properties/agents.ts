import { prisma } from '@neup/core/database/prisma';

export type PropertyAgentField = 'name' | 'displayName' | 'image' | 'displayImage';
export type PropertyAgent = { id: string; name?: string | null; image?: string | null };

const allowedFields = new Set<PropertyAgentField>(['name', 'displayName', 'image', 'displayImage']);

function requestedFields(include: string[]) {
  const fields = include.filter((field): field is PropertyAgentField => allowedFields.has(field as PropertyAgentField));
  return {
    name: fields.includes('name') || fields.includes('displayName'),
    image: fields.includes('image') || fields.includes('displayImage'),
  };
}

async function getAgents(ids: string[], include: string[] = []): Promise<PropertyAgent[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const fields = requestedFields(include);
  const accounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, displayName: true, displayImage: true },
  });
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return uniqueIds.map((id) => {
    const account = accountById.get(id);
    const result: PropertyAgent = { id };
    if (fields.name) result.name = account?.displayName ?? null;
    if (fields.image) result.image = account?.displayImage ?? null;
    return result;
  });
}

export async function getMainAgent(agentId?: string | null, include: string[] = []): Promise<PropertyAgent[]> {
  return getAgents(agentId ? [agentId] : [], include);
}

export async function getSupportingAgents(agentIds: Array<string | { id?: string }> = [], include: string[] = []): Promise<PropertyAgent[]> {
  const ids = agentIds.map((agent) => typeof agent === 'string' ? agent : agent.id ?? '');
  return getAgents(ids, include);
}

export type PropertyAgency = { id: string; name?: string | null; image?: string | null };

export async function getPropertyAgency(agencyId?: string | null, include: string[] = []): Promise<PropertyAgency | null> {
  const id = agencyId?.trim();
  if (!id) return null;

  const fields = requestedFields(include);
  const agency = await prisma.agency.findUnique({
    where: { id },
    select: { id: true, name: true, logoUrl: true },
  });
  const account = !agency && (fields.name || fields.image)
    ? await prisma.account.findUnique({
        where: { id },
        select: { id: true, displayName: true, displayImage: true },
      })
    : null;
  const result: PropertyAgency = { id };
  if (fields.name) result.name = agency?.name ?? account?.displayName ?? null;
  if (fields.image) result.image = agency?.logoUrl ?? account?.displayImage ?? null;
  return result;
}
