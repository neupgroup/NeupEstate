import { requireAuth } from '@/services/auth/account';
import { getAccounts } from '@/services/account-service';
import { getAgencyAgentMapsByAgency } from '@/services/agency-agent-map-service';
import { hasPermission } from '@/logica/auth/authorization';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { AgentMapManager } from '@/components/manage/agent-map-manager';
import { notFound } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function getSelectedAgency(searchParams?: Promise<SearchParams>) {
  return searchParams?.then((resolved) => {
    const value = resolved?.selectedAgency;
    return Array.isArray(value) ? value[0] : value?.trim() || null;
  }) ?? Promise.resolve(null);
}

export default async function ManageAgentMapPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const allowed = await hasPermission(PERMISSIONS.manage.agentMapView);
  if (!allowed) {
    notFound();
  }

  await requireAuth();
  const [accounts, selectedAgencyFromQuery] = await Promise.all([
    getAccounts(),
    getSelectedAgency(searchParams),
  ]);

  const agencies = accounts.filter((account) => account.account_type === 'brand');
  const defaultSelectedAgency = selectedAgencyFromQuery ?? agencies[0]?.id ?? null;
  const selectedAgencyId = defaultSelectedAgency && agencies.some((agency) => agency.id === defaultSelectedAgency)
    ? defaultSelectedAgency
    : agencies[0]?.id ?? null;
  const initialLinks = selectedAgencyId ? await getAgencyAgentMapsByAgency(selectedAgencyId) : [];

  return (
    <AgentMapManager
      agencies={agencies}
      accounts={accounts}
      initialLinks={initialLinks}
      selectedAgencyId={selectedAgencyId}
    />
  );
}
