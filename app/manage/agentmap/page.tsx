import { requireAuth } from '@/services/auth/account';
import { getAccounts } from '@/services/account-service';
import { getAgencyAgentMapsByAgent } from '@/services/agency-agent-map-service';
import { hasPermission } from '@/logica/auth/authorization';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { AgentMapManager } from '@/components/manage/agent-map-manager';
import { notFound } from 'next/navigation';

export default async function ManageAgentMapPage() {
  const allowed = await hasPermission(PERMISSIONS.manage.agentMapView);
  if (!allowed) {
    notFound();
  }

  const authAccount = await requireAuth();

  const [accounts, links] = await Promise.all([
    getAccounts(),
    getAgencyAgentMapsByAgent(authAccount.aid),
  ]);

  const agencies = accounts.filter((account) => account.account_type === 'brand');

  return (
    <AgentMapManager
      currentAccountId={authAccount.aid}
      agencies={agencies}
      initialLinks={links}
    />
  );
}
