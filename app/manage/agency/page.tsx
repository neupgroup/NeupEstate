import { getBrandAccounts } from "@/services/neupid/get-brand-accounts";
import { prisma } from "@/logica/core/prisma";
import { requireAuth } from "@/services/auth/account";
import { getAgencyMapByAccount } from "@/services/agency-customization-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Building } from "lucide-react";
import { BrandAccountCard, type AgencyManagementAccount } from "./brand-account-card";
import { ClientLink } from "@/components/client-link";

type SearchParams = Record<string, string | string[] | undefined>;

async function getSelectedAgency(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function ManageAgencyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const selectedAgency = await getSelectedAgency(searchParams);
  const [brandAccountsResult, membership, linkedAgencyMappings, localAccount] = await Promise.all([
    getBrandAccounts(),
    getAgencyMapByAccount(authAccount.aid),
    prisma.agencyMap.findMany({
      where: { accountId: authAccount.aid },
      select: { agencyAccountId: true },
      orderBy: { agencyAccountId: "asc" },
    }),
    prisma.account.findUnique({
      where: { id: authAccount.aid },
      select: { id: true, displayName: true, displayImage: true, accountType: true },
    }),
  ]);

  const brandAccounts = brandAccountsResult.success ? brandAccountsResult.accounts : [];
  const linkedAgencyIds = Array.from(
    new Set(
      [
        localAccount?.accountType === "brand" ? localAccount.id : null,
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
    source: "brand",
  }));

  const localAgencyCards: AgencyManagementAccount[] = linkedAgencyIds
    .filter((agencyAccountId) => !brandAccounts.some((brandAccount) => brandAccount.id === agencyAccountId))
    .map((agencyAccountId) => {
      const existingAccount = existingAccountMap.get(agencyAccountId);
      return {
        id: agencyAccountId,
        displayName: existingAccount?.displayName || agencyAccountId,
        displayImage: existingAccount?.displayImage || null,
        accountType: existingAccount?.accountType || "brand",
        status: null,
        isVerified: false,
        source: "linked" as const,
      };
    });

  const accessibleAgencies: AgencyManagementAccount[] = [...remoteBrandCards, ...localAgencyCards];
  const accessibleAgencyIds = new Set(accessibleAgencies.map((agency) => agency.id));
  const effectiveSelectedAgency =
    (selectedAgency && accessibleAgencyIds.has(selectedAgency) ? selectedAgency : null) ??
    accessibleAgencies[0]?.id ??
    null;
  const createdAgencyCount = existingAccounts.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Agency Management
        </h2>
        <p className="text-sm text-muted-foreground">
          {accessibleAgencies.length} accessible account
          {accessibleAgencies.length !== 1 ? "s" : ""}
          {createdAgencyCount > 0
            ? `, ${createdAgencyCount} already created in the local database`
            : ""}
        </p>
      </div>

      {!brandAccountsResult.success ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Brand Accounts</AlertTitle>
          <AlertDescription>
            {brandAccountsResult.error ||
              "Failed to fetch brand accounts from NeupID"}
          </AlertDescription>
        </Alert>
      ) : null}

      {accessibleAgencies.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
            {accessibleAgencies.map((brandAccount, index) => {
              return (
                <BrandAccountCard
                  key={brandAccount.id}
                  brandAccount={brandAccount}
                  existingAccount={existingAccountMap.get(brandAccount.id) || null}
                  isSelected={effectiveSelectedAgency === brandAccount.id}
                  isLast={index === accessibleAgencies.length - 1}
                />
              );
            })}
          </div>

          {effectiveSelectedAgency ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="font-medium">Selected agency actions</p>
                <p className="text-sm text-muted-foreground">
                  Open agency-specific operational reporting or move to team management.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ClientLink
                  href={`/manage/customization?selectedAgency=${encodeURIComponent(effectiveSelectedAgency)}`}
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Open customization
                </ClientLink>
                <ClientLink
                  href={`/manage/report?selectedAgency=${encodeURIComponent(effectiveSelectedAgency)}`}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open reports
                </ClientLink>
                <ClientLink
                  href={`/manage/team?selectedAgency=${encodeURIComponent(effectiveSelectedAgency)}`}
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  View team
                </ClientLink>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <Alert>
          <Building className="h-4 w-4" />
          <AlertTitle>No Accessible Accounts Found</AlertTitle>
          <AlertDescription>
            No accessible agency or brand accounts were found for this login.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
