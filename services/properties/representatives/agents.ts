import { prisma } from '@neup/core/database/prisma';

export type AgentRepresentative = {
  id: string;
  type: 'listingOwner' | 'agent';
  role?: 'listingOwner' | 'supportingAgent';
  name?: string | null;
  image?: string | null;
};

export async function getPropertyAgentRepresentatives(input: {
  listingOwnerId?: string | null;
  supportingAgentIds?: Array<string | { id?: string }>;
  includeListingOwner?: boolean;
  includeAgents?: boolean;
  includeSupportingAgents?: boolean;
}): Promise<AgentRepresentative[]> {
  const listingOwnerId = input.listingOwnerId?.trim() || '';
  const supportingAgentIds = [...new Set((input.supportingAgentIds ?? [])
    .map((agent) => typeof agent === 'string' ? agent : agent.id ?? '')
    .map((id) => id.trim())
    .filter(Boolean))];
  const candidateAgentIds = [...new Set([
    ...(input.includeAgents && listingOwnerId ? [listingOwnerId] : []),
    ...(input.includeSupportingAgents ? supportingAgentIds : []),
  ])];

  const [agentRecords, acceptedAgentLinks] = candidateAgentIds.length
    ? await Promise.all([
        prisma.agent.findMany({
          where: { userId: { in: candidateAgentIds } },
          select: { userId: true },
        }),
        prisma.agencyAgentMap.findMany({
          where: { agentId: { in: candidateAgentIds }, status: 'accepted' },
          select: { agentId: true },
        }),
      ])
    : [[], []];
  const mappedAgentIds = new Set<string>([
    ...agentRecords.map((agent) => agent.userId).filter((id): id is string => Boolean(id)),
    ...acceptedAgentLinks.map((link) => link.agentId),
  ]);
  const listingOwnerIsAgent = listingOwnerId ? mappedAgentIds.has(listingOwnerId) : false;

  const accountIds = [...new Set([
    ...(input.includeListingOwner && listingOwnerId ? [listingOwnerId] : []),
    ...(input.includeAgents && listingOwnerIsAgent && listingOwnerId ? [listingOwnerId] : []),
    ...(input.includeSupportingAgents ? supportingAgentIds : []),
  ])];
  const accounts = accountIds.length
    ? await prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, displayName: true, displayImage: true },
      })
    : [];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const representatives: AgentRepresentative[] = [];

  if (input.includeListingOwner && listingOwnerId && !(input.includeAgents && listingOwnerIsAgent)) {
    const account = accountById.get(listingOwnerId);
    representatives.push({
      id: listingOwnerId,
      type: 'listingOwner',
      ...(account ? { name: account.displayName, image: account.displayImage } : {}),
    });
  }

  if (input.includeAgents && listingOwnerId && listingOwnerIsAgent) {
    const account = accountById.get(listingOwnerId);
    representatives.push({
      id: listingOwnerId,
      type: 'agent',
      role: 'listingOwner',
      ...(account ? { name: account.displayName, image: account.displayImage } : {}),
    });
  }

  if (input.includeSupportingAgents) {
    for (const agentId of supportingAgentIds) {
      const account = accountById.get(agentId);
      representatives.push({
        id: agentId,
        type: 'agent',
        role: 'supportingAgent',
        ...(account ? { name: account.displayName, image: account.displayImage } : {}),
      });
    }
  }

  return representatives;
}
