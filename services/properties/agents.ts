import { prisma } from '@neup/core/database/prisma';

export type PropertyAgentField = 'name' | 'displayImage';
export type PropertyAgent = { id: string } & Partial<Record<PropertyAgentField, string | null>>;

const allowedFields = new Set<PropertyAgentField>(['name', 'displayImage']);

async function getAgents(ids: string[], include: string[] = []): Promise<PropertyAgent[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const fields = include.filter((field): field is PropertyAgentField => allowedFields.has(field as PropertyAgentField));
  const accounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      ...(fields.includes('name') ? { displayName: true } : {}),
      ...(fields.includes('displayImage') ? { displayImage: true } : {}),
    },
  });
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return uniqueIds.map((id) => {
    const account = accountById.get(id);
    const result: PropertyAgent = { id };
    if (fields.includes('name')) result.name = account?.displayName ?? null;
    if (fields.includes('displayImage')) result.displayImage = account?.displayImage ?? null;
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
