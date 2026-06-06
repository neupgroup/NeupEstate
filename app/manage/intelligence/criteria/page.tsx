import { prisma } from '@/logica/core/prisma';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { getCurrentAccountId } from '@/app/actions';
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
