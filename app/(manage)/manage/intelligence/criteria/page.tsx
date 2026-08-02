import { prisma } from '@/core/database/prisma';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { getCurrentAccountId } from '@/services/identity';
import { IntelligenceCriteriaClient } from './criteria-client';

export default async function IntelligenceCriteriaPage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const accountId = await getCurrentAccountId();

  const [criteria, competitors] = accountId
    ? await Promise.all([
        prisma.intelligenceMapping.findMany({
          where: { accountId },
          orderBy: { createdAt: 'desc' },
          include: { competitor: true },
        }),
        prisma.competitor.findMany({
          orderBy: { createdAt: 'desc' },
        }),
      ])
    : [[], []];

  return <IntelligenceCriteriaClient criteria={criteria} competitors={competitors} />;
}
