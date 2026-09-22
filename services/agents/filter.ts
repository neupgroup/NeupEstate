import type { Prisma } from '@neup/core/database/prisma';

export type Filters = { id?: string; name?: string; query?: string; neupId?: string; agency?: string };

export function filter(input: Filters = {}): Prisma.AccountWhereInput {
  const where: Prisma.AccountWhereInput = { accountType: 'individual.agent' };
  if (input.id) where.id = input.id;
  if (input.neupId) where.neupId = input.neupId;
  if (input.name) where.displayName = { contains: input.name, mode: 'insensitive' };
  if (input.query) where.OR = [
    { displayName: { contains: input.query, mode: 'insensitive' } },
    { neupId: { contains: input.query, mode: 'insensitive' } },
  ];
  if (input.agency) where.agencyAgentMapAsAgent = { some: { agencyId: input.agency, status: 'accepted' } };
  return where;
}
