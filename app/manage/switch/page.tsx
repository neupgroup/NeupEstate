import { requireAuth } from '@/services/auth/account';
import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';
import { prisma } from '@/logica/core/prisma';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { BrandAccountCard, type AgencyManagementAccount } from '../team/brand-account-card';
import { syncBrandAccountsToLocalAccounts } from '../team/account-actions';

type SearchParams = Record<string, string | string[] | undefined>;

async function getSelectedAgency(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function ManageSwitchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const selectedAgency = await getSelectedAgency(searchParams);

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
      select: { id: true, displayName: true, displayImage: true, accountType: true, workingProfile: true },
    }),
  ]);

  const brandAccounts = brandAccountsResult.success ? brandAccountsResult.accounts : [];
  await syncBrandAccountsToLocalAccounts(brandAccounts);

  const linkedAgencyIds = Array.from(
    new Set(
      [
        localAccount?.accountType === 'brand' ? localAccount.id : null,
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
          select: { id: true, displayName: true, displayImage: true, accountType: true },
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
        status: null,
        isVerified: false,
        source: 'linked' as const,
      };
    });

  const accessibleAgencies: AgencyManagementAccount[] = [...remoteBrandCards, ...localAgencyCards];
  const accessibleAgencyIds = new Set(accessibleAgencies.map((agency) => agency.id));

  const agencyAccountId =
    selectedAgency && accessibleAgencyIds.has(selectedAgency)
      ? selectedAgency
      : membership?.agencyAccountId ?? accessibleAgencies[0]?.id ?? authAccount.aid;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Switch profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Change the agency context for this page and choose which profile should stay active by default.
        </p>
      </div>

      {!brandAccountsResult.success ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Brand Accounts</AlertTitle>
          <AlertDescription>
            {brandAccountsResult.error || 'Failed to fetch brand accounts from NeupID'}
          </AlertDescription>
        </Alert>
      ) : null}

      {accessibleAgencies.length > 0 ? (
        <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
          {accessibleAgencies.map((brandAccount, index) => (
            <BrandAccountCard
              key={brandAccount.id}
              brandAccount={brandAccount}
              existingAccount={existingAccountMap.get(brandAccount.id) || null}
              isSelected={agencyAccountId === brandAccount.id}
              isDefault={localAccount?.workingProfile === brandAccount.id}
              isLast={index === accessibleAgencies.length - 1}
            />
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Accessible Accounts Found</AlertTitle>
          <AlertDescription>
            No accessible agency or brand accounts were found for this login.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
