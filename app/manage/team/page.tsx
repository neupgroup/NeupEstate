import { requireAuth } from '@/services/auth/account';
import { getAccountById } from '@/services/account-service';
import {
  getAgencyMapByAccount,
  getAgencyMapsByAgency,
} from '@/services/agency-customization-service';
import { prisma } from '@/lib/prisma';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClientLink } from '@/components/client-link';
import {
  AlertCircle,
  Building2,
  Clock3,
  Globe,
  Shield,
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

function getSelectedAgency(searchParams?: SearchParams) {
  const value = searchParams?.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function ManageTeamPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const authAccount = await requireAuth();
  const selectedAgency = getSelectedAgency(searchParams);

  const membership = await getAgencyMapByAccount(authAccount.aid);
  const selectedAgencyMembers = selectedAgency
    ? await getAgencyMapsByAgency(selectedAgency)
    : [];

  const selectedAgencyIsAllowed =
    selectedAgency === null ||
    selectedAgency === authAccount.aid ||
    membership?.agencyAccountId === selectedAgency ||
    selectedAgencyMembers.some((member) => member.accountId === authAccount.aid);

  const agencyAccountId =
    selectedAgencyIsAllowed && selectedAgency
      ? selectedAgency
      : membership?.agencyAccountId ?? authAccount.aid;
  const isDirectAgencyOwner = !membership;

  const agencyMembers = await getAgencyMapsByAgency(agencyAccountId);
  const agencyAccount = await getAccountById(agencyAccountId);

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

  const agencyDisplayName = agencyAccount?.display_name ?? agencyAccountId;
  const addMemberHref = `/manage/teams/create?selectedAgency=${encodeURIComponent(agencyAccountId)}`;
  const manageAgencyHref = `/manage/agency?selectedAgency=${encodeURIComponent(agencyAccountId)}`;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            Team
          </h2>
          <Badge variant={isDirectAgencyOwner ? 'default' : 'secondary'}>
            {isDirectAgencyOwner ? 'Brand account' : 'Agency member'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Accounts connected to {agencyDisplayName}. This is the roster for the agency brand account
          that you manage or belong to.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Members</p>
          <p className="mt-2 text-2xl font-semibold">{totalMembers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Registered</p>
          <p className="mt-2 text-2xl font-semibold">{registeredMembers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Admins</p>
          <p className="mt-2 text-2xl font-semibold">{adminMembers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Locked</p>
          <p className="mt-2 text-2xl font-semibold">{lockedMembers}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-12 w-12 border">
              <AvatarImage
                src={agencyAccount?.display_image || undefined}
                alt={agencyDisplayName}
              />
              <AvatarFallback>{getInitials(agencyAccount?.display_name ?? null)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold">{agencyDisplayName}</h3>
                {membership && (
                  <Badge variant="outline">
                    <Shield className="mr-1 h-3 w-3" />
                    Your role: {getRoleLabel(membership.role)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Brand account ID: {agencyAccountId}
              </p>
            </div>
          </div>

          <ClientLink
            href={manageAgencyHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            View agency settings
          </ClientLink>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium">Selected agency is active</p>
            <p className="text-muted-foreground">
              New team members will be created for this agency.
            </p>
          </div>
          <ClientLink
            href={addMemberHref}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <UsersRound className="h-4 w-4" />
            Add team member
          </ClientLink>
        </div>

        {memberRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberRows.map(({ member, account }) => {
                const displayName = account.displayName ?? account.id;
                const isCurrentAccount = account.id === authAccount.aid;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={account.displayImage || undefined}
                            alt={displayName}
                          />
                          <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ClientLink
                              href={`/manage/accounts/${account.id}`}
                              className="truncate hover:underline"
                            >
                              {displayName}
                            </ClientLink>
                            {isCurrentAccount && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{account.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        <UsersRound className="mr-1 h-3 w-3" />
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={account.registered ? 'default' : 'secondary'}>
                          {account.registered ? 'Registered' : 'Guest'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {account.accountType}
                        </Badge>
                        {member.lockIn && (
                          <Badge variant="outline">Locked</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(account.createdOn).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(account.accessedOn).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No connected accounts found</AlertTitle>
            <AlertDescription>
              {membership
                ? 'Your account is linked to an agency, but no member accounts have been mapped yet.'
                : 'This brand account does not have any linked team members yet.'}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {!memberRows.length && !membership && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>No agency mapping yet</AlertTitle>
          <AlertDescription>
            Create or join an agency brand account first, then linked accounts will appear here.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
