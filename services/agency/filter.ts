import type { Prisma } from '@neup/core/database/prisma';

export type Filters = { id?: string; name?: string; query?: string; neupId?: string; agent?: string };

export function filter(input: Filters = {}): Prisma.AccountWhereInput {
  const where: Prisma.AccountWhereInput = { accountType: { in: ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'] } };
  if (input.id) where.id = input.id;
  if (input.neupId) where.neupId = input.neupId;
  if (input.name) where.displayName = { contains: input.name, mode: 'insensitive' };
  if (input.query) where.OR = [
    { displayName: { contains: input.query, mode: 'insensitive' } },
    { neupId: { contains: input.query, mode: 'insensitive' } },
  ];
  if (input.agent) where.agencyAgentMapAsAgency = { some: { agentId: input.agent, status: 'accepted' } };
  return where;
}
