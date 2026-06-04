import { getBrandAccounts } from "@/services/neupid/get-brand-accounts";
import { prisma } from "@/logica/core/prisma";
import { requireAuth } from "@/services/auth/account";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Building } from "lucide-react";
import { BrandAccountCard } from "./brand-account-card";

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
  // Require authentication — redirects to login if not authenticated
  const authAccount = await requireAuth();
  const selectedAgency = await getSelectedAgency(searchParams);
  const brandAccountsResult = await getBrandAccounts();

  if (!brandAccountsResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            Agency Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your brand accounts and agencies
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Brand Accounts</AlertTitle>
          <AlertDescription>
            {brandAccountsResult.error ||
              "Failed to fetch brand accounts from NeupID"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const brandAccounts = brandAccountsResult.accounts;

  const existingAccountIds =
    brandAccounts.length > 0
      ? await prisma.account.findMany({
          where: { id: { in: brandAccounts.map((ba) => ba.id) } },
          select: { id: true, displayName: true, displayImage: true },
        })
      : [];

  const existingAccountMap = new Map(
    existingAccountIds.map((acc) => [acc.id, acc])
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Agency Management
        </h2>
        <p className="text-sm text-muted-foreground">
          {brandAccounts.length} brand account
          {brandAccounts.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {brandAccounts.length > 0 ? (
        <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
          {brandAccounts.map((brandAccount, index) => {
            const existingAccount = existingAccountMap.get(brandAccount.id);
            return (
              <BrandAccountCard
                key={brandAccount.id}
                brandAccount={brandAccount}
                existingAccount={existingAccount || null}
                isSelected={selectedAgency === brandAccount.id}
                isLast={index === brandAccounts.length - 1}
              />
            );
          })}
        </div>
      ) : (
        <Alert>
          <Building className="h-4 w-4" />
          <AlertTitle>No Brand Accounts Found</AlertTitle>
          <AlertDescription>
            No brand accounts were found in your NeupID account. Please create
            a brand account first.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
