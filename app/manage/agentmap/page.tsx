import { requireAuth } from '@/services/auth/account';
import { getAccounts } from '@/services/account-service';
import { getAgencyAgentMapsByAgent } from '@/services/agency-agent-map-service';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { AgentMapManager } from '@/components/manage/agent-map-manager';

export default async function ManageAgentMapPage() {
  await requirePagePermission(PERMISSIONS.manage.agentMapView);
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
