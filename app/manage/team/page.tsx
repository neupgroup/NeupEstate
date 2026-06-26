import { requireAuth } from '@/services/auth/account';
import { getAccountById, getAccounts } from '@/services/account-service';
import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';
import {
  getAgencyMapByAccount,
  getAgencyMapsByAgency,
} from '@/services/agency-customization-service';
import { getAgencyAgentMapsByAgency } from '@/services/agency-agent-map-service';
import { prisma } from '@/logica/core/prisma';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { ClientLink } from '@/components/client-link';
import { AgentMapManager } from '@/components/manage/agent-map-manager';
import {
  AlertCircle,
  ChevronRight,
  UsersRound,
} from 'lucide-react';

type TeamRow = {
  id: string;
  accountType: string;
  registered: boolean;
  createdOn: Date;
  accessedOn: Date;
  displayName: string | null;
  displayImage: string | null;
};

function getInitials(name: string | null | undefined) {
  if (!name) return 'NA';

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getRoleBadgeVariant(role: string) {
  if (role === 'admin') return 'default' as const;
  if (role === 'agent') return 'secondary' as const;
  return 'outline' as const;
}

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

type SearchParams = Record<string, string | string[] | undefined>;

async function getSelectedAgency(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function ManageTeamPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const selectedAgency = await getSelectedAgency(searchParams);
  const [brandAccountsResult, membership] = await Promise.all([
    getBrandAccounts(),
    getAgencyMapByAccount(authAccount.aid),
  ]);
  const accessibleAgencyIds = new Set(
    (brandAccountsResult.success ? brandAccountsResult.accounts : []).map((account) => account.id),
  );

  const selectedAgencyMembers = selectedAgency
    ? await getAgencyMapsByAgency(selectedAgency)
    : [];

  const selectedAgencyIsAllowed =
    selectedAgency === null ||
    selectedAgency === authAccount.aid ||
    membership?.agencyAccountId === selectedAgency ||
    selectedAgencyMembers.some((member) => member.accountId === authAccount.aid) ||
    accessibleAgencyIds.has(selectedAgency ?? '');

  const agencyAccountId =
    selectedAgencyIsAllowed && selectedAgency && accessibleAgencyIds.has(selectedAgency)
      ? selectedAgency
      : membership?.agencyAccountId ?? authAccount.aid;

  const [agencyMembers, agencyAccount, allAccounts, agencyAgentLinks] = await Promise.all([
    getAgencyMapsByAgency(agencyAccountId),
    getAccountById(agencyAccountId),
    getAccounts(),
    getAgencyAgentMapsByAgency(agencyAccountId),
  ]);

  const relatedAccountIds = Array.from(
    new Set([agencyAccountId, ...agencyMembers.map((member) => member.accountId)]),
  );

  const relatedAccounts = relatedAccountIds.length
    ? await prisma.account.findMany({
        where: { id: { in: relatedAccountIds } },
        select: {
          id: true,
          accountType: true,
          createdOn: true,
          accessedOn: true,
          displayName: true,
          displayImage: true,
        },
      })
    : [];

  const accountMap = new Map<string, TeamRow>(
    relatedAccounts.map((account) => [
      account.id,
      {
        ...account,
        registered: account.accountType !== 'guest',
      },
    ]),
  );

  const memberRows = agencyMembers
    .map((member) => {
      const account = accountMap.get(member.accountId);

      return account
        ? { member, account }
        : null;
    })
    .filter(
      (entry): entry is { member: (typeof agencyMembers)[number]; account: TeamRow } =>
        entry !== null,
    )
    .sort((left, right) => {
      const order = { admin: 0, agent: 1, viewer: 2 } as const;
      const roleDiff = order[left.member.role] - order[right.member.role];
      if (roleDiff !== 0) return roleDiff;

      const leftName = left.account.displayName ?? left.account.id;
      const rightName = right.account.displayName ?? right.account.id;
      return leftName.localeCompare(rightName);
    });

  const totalMembers = memberRows.length;
  const registeredMembers = memberRows.filter(({ account }) => account.registered).length;
  const lockedMembers = agencyMembers.filter((member) => member.lockIn).length;
  const adminMembers = agencyMembers.filter((member) => member.role === 'admin').length;
  const memberAccountIds = new Set(memberRows.map(({ account }) => account.id));
  const accountDirectory = new Map(allAccounts.map((account) => [account.id, account]));
  const invitedRows = agencyAgentLinks
    .filter((link) => !memberAccountIds.has(link.agentId))
    .map((link) => ({
      link,
      account: accountDirectory.get(link.agentId) ?? null,
    }));

  const agencyDisplayName = agencyAccount?.display_name ?? agencyAccountId;
  const addMemberHref = `/manage/teams/create?selectedAgency=${encodeURIComponent(agencyAccountId)}`;
  const switchHref = `/manage/switch?selectedAgency=${encodeURIComponent(agencyAccountId)}`;

  return (
    <div className="space-y-8">
      {!brandAccountsResult.success ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Brand Accounts</AlertTitle>
          <AlertDescription>
            {brandAccountsResult.error || 'Failed to fetch brand accounts from NeupID'}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              Team{' '}
              <span className="text-muted-foreground">
                (at <ClientLink href={switchHref} className="hover:underline">{agencyDisplayName}</ClientLink>)
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review everyone connected to this working profile, including pending invited users, then switch your working profile if needed.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card divide-y divide-border">
          <ClientLink
            href={addMemberHref}
            className="flex w-full items-center justify-between gap-4 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <UsersRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold">Add team</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use this to add or join the agency agent map for {agencyDisplayName}.
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
          </ClientLink>

          {memberRows.map(({ member, account }) => {
            const displayName = account.displayName ?? account.id;
            const isCurrentAccount = account.id === authAccount.aid;

            return (
              <div key={member.id} className="flex flex-col justify-between p-5">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={account.displayImage || undefined} alt={displayName} />
                      <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ClientLink
                          href={`/manage/accounts/${account.id}`}
                          className="truncate text-base font-semibold hover:underline"
                        >
                          {displayName}
                        </ClientLink>
                        {isCurrentAccount ? (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{account.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      <UsersRound className="mr-1 h-3 w-3" />
                      {getRoleLabel(member.role)}
                    </Badge>
                    <Badge variant={account.registered ? 'default' : 'secondary'}>
                      {account.registered ? 'Registered' : 'Guest'}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {account.accountType}
                    </Badge>
                    {member.lockIn ? <Badge variant="outline">Locked</Badge> : null}
                  </div>
                </div>

                <div className="grid gap-3 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider">Created</p>
                    <p className="mt-1 text-foreground">{new Date(account.createdOn).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider">Last active</p>
                    <p className="mt-1 text-foreground">{new Date(account.accessedOn).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {invitedRows.map(({ link, account }) => {
            const displayName = account?.display_name || link.agentId;

            return (
              <div key={link.id} className="flex flex-col justify-between p-5">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={account?.display_image || undefined} alt={displayName} />
                      <AvatarFallback>{getInitials(account?.display_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{displayName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{link.agentId}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {link.status === 'accepted' ? 'Accepted invite' : 'Invited'}
                    </Badge>
                    {link.isAdmin ? <Badge>Admin invite</Badge> : null}
                    {account ? (
                      <Badge variant="outline" className="capitalize">
                        {account.account_type}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <p className="pt-4 text-sm text-muted-foreground">
                  This user is associated through the agency invitation flow and has not been added to the mapped roster yet.
                </p>
              </div>
            );
          })}

          {memberRows.length === 0 && invitedRows.length === 0 ? (
            <div className="p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">No connected accounts found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {membership
                      ? 'Your account is linked to an agency, but no member accounts have been mapped yet.'
                      : 'This brand account does not have any linked team members yet.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <AgentMapManager
        agencies={allAccounts.filter((account) => account.account_type === 'brand')}
        accounts={allAccounts}
        initialLinks={agencyAgentLinks}
        selectedAgencyId={agencyAccountId}
        title="Agency Invitations"
        description={`Invite agents to ${agencyDisplayName} and review current invitation status.`}
        showAgencySelector={false}
      />
    </div>
  );
}
