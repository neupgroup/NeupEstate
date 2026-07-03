import { requireAuth } from '@/services/auth/account';
import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';
import { prisma } from '@/logica/core/prisma';
import { ClientLink } from '@/components/client-link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { BrandAccountCard, type AgencyManagementAccount } from '../manage/team/brand-account-card';
import { syncBrandAccountsToLocalAccounts } from '../manage/team/account-actions';
import { isAgencyLikeAccountType } from '@/services/account-type';

type SearchParams = Record<string, string | string[] | undefined>;

async function getWorkingProfile(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.workingProfile;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

async function getBacks(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.backs;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

function resolveBackPath(backs: string | null) {
  if (!backs) return null;

  const atIndex = backs.indexOf('@');
  const encodedPath = atIndex >= 0 ? backs.slice(atIndex + 1) : backs;

  try {
    const decodedPath = decodeURIComponent(encodedPath);
    return decodedPath.startsWith('/') ? decodedPath : null;
  } catch {
    return null;
  }
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const [selectedAgency, backs] = await Promise.all([
    getWorkingProfile(searchParams),
    getBacks(searchParams),
  ]);
  const backPath = resolveBackPath(backs);

  const [brandAccountsResult, membership, linkedAgencyMappings, localAccount] = await Promise.all([
    getBrandAccounts(),
    prisma.agencyMap.findFirst({
      where: { accountId: authAccount.aid },
      select: { agencyAccountId: true },
    }),
    prisma.agencyMap.findMany({
      where: { accountId: authAccount.aid },
      select: { agencyAccountId: true },
      orderBy: { agencyAccountId: 'asc' },
    }),
    prisma.account.findUnique({
      where: { id: authAccount.aid },
      select: { id: true, displayName: true, displayImage: true, accountType: true, workingProfile: true, connectionId: true },
    }),
  ]);

  const brandAccounts = brandAccountsResult.success ? brandAccountsResult.accounts : [];
  await syncBrandAccountsToLocalAccounts(brandAccounts);

  const linkedAgencyIds = Array.from(
    new Set(
      [
        localAccount?.id ?? null,
        membership?.agencyAccountId ?? null,
        ...linkedAgencyMappings.map((mapping) => mapping.agencyAccountId),
        ...brandAccounts.map((account) => account.id),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const existingAccounts =
    linkedAgencyIds.length > 0
      ? await prisma.account.findMany({
          where: { id: { in: linkedAgencyIds } },
          select: { id: true, displayName: true, displayImage: true, accountType: true, connectionId: true },
        })
      : [];

  const existingAccountMap = new Map(existingAccounts.map((account) => [account.id, account]));

  const remoteBrandCards: AgencyManagementAccount[] = brandAccounts.map((brandAccount) => ({
    ...brandAccount,
    source: 'brand',
  }));

  const localAgencyCards: AgencyManagementAccount[] = linkedAgencyIds
    .filter((agencyAccountId) => !brandAccounts.some((brandAccount) => brandAccount.id === agencyAccountId))
    .map((agencyAccountId) => {
      const existingAccount = existingAccountMap.get(agencyAccountId);
      return {
        id: agencyAccountId,
        displayName: existingAccount?.displayName || agencyAccountId,
        displayImage: existingAccount?.displayImage || null,
        accountType: existingAccount?.accountType || 'brand',
        isVerified: false,
        source: 'linked' as const,
      };
    });

  const accessibleProfiles: AgencyManagementAccount[] = [...remoteBrandCards, ...localAgencyCards];
  const accountAgentProfiles = accessibleProfiles.filter((profile) => {
    const existingAccount = existingAccountMap.get(profile.id);
    const accountType = existingAccount?.accountType ?? profile.accountType;
    return Boolean(existingAccount) && !isAgencyLikeAccountType(accountType);
  });
  const switchableAgencyProfiles = accessibleProfiles.filter((agency) => {
    const existingAccount = existingAccountMap.get(agency.id);
    const accountType = existingAccount?.accountType ?? agency.accountType;
    if (!isAgencyLikeAccountType(accountType)) return false;
    return Boolean(existingAccount?.connectionId?.trim());
  });
  const creatableAccounts = remoteBrandCards.filter((agency) => {
    const existingAccount = existingAccountMap.get(agency.id);
    return !existingAccount?.connectionId?.trim() && ['brand', 'subbrand'].includes(agency.accountType.trim().toLowerCase());
  });
  const switchableProfiles = [...accountAgentProfiles, ...switchableAgencyProfiles];
  const switchableProfileIds = new Set(switchableProfiles.map((profile) => profile.id));

  const selectedProfileId =
    selectedAgency && switchableProfileIds.has(selectedAgency)
      ? selectedAgency
      : localAccount?.workingProfile && switchableProfileIds.has(localAccount.workingProfile)
        ? localAccount.workingProfile
        : membership?.agencyAccountId && switchableProfileIds.has(membership.agencyAccountId)
          ? membership.agencyAccountId
          : accountAgentProfiles[0]?.id ?? switchableAgencyProfiles[0]?.id ?? null;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {backPath ? (
          <ClientLink
            href={backPath}
            className="mb-3 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &lt; Go Back
          </ClientLink>
        ) : null}
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Switch the account context for this page and choose which profile should stay active by default.
        </p>
      </div>

      {!brandAccountsResult.success ? (
        <Alert variant="destructive" className="mx-auto w-full max-w-3xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Accounts</AlertTitle>
          <AlertDescription>
            {brandAccountsResult.error || 'Failed to fetch accounts from NeupID'}
          </AlertDescription>
        </Alert>
      ) : null}

      {accountAgentProfiles.length > 0 ? (
        <section className="mx-auto w-full max-w-3xl space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Accounts/Agents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the personal or agent profile you want to work from.
            </p>
          </div>
          <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
            {accountAgentProfiles.map((brandAccount, index) => (
              <BrandAccountCard
                key={brandAccount.id}
                brandAccount={brandAccount}
                existingAccount={existingAccountMap.get(brandAccount.id) || null}
                isSelected={selectedProfileId === brandAccount.id}
                isDefault={localAccount?.workingProfile === brandAccount.id}
                isLast={index === accountAgentProfiles.length - 1}
                backs={backs}
              />
            ))}
          </div>
        </section>
      ) : (
        <Alert className="mx-auto w-full max-w-3xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Switchable Accounts Found</AlertTitle>
          <AlertDescription>
            No personal or agent accounts were found for this login yet.
          </AlertDescription>
        </Alert>
      )}

      {switchableAgencyProfiles.length > 0 || creatableAccounts.length > 0 ? (
        <section className="mx-auto w-full max-w-3xl space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Agency Profiles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the agency you want to post from.
            </p>
          </div>
          <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
            {[...switchableAgencyProfiles, ...creatableAccounts].map((brandAccount, index, agencyProfiles) => {
              const isCreatable = creatableAccounts.some((account) => account.id === brandAccount.id);
              return (
                <BrandAccountCard
                  key={brandAccount.id}
                  brandAccount={brandAccount}
                  existingAccount={existingAccountMap.get(brandAccount.id) || null}
                  isSelected={selectedProfileId === brandAccount.id}
                  isDefault={localAccount?.workingProfile === brandAccount.id}
                  isLast={index === agencyProfiles.length - 1}
                  allowSelection={!isCreatable}
                  backs={backs}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
