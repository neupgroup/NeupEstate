import { ChevronRight, Layers3 } from 'lucide-react';
import { Link } from '@neup/components/ui/link';
import { requireAuth } from '@/services/auth/account';
import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';
import { prisma } from '@neup/core/database/prisma';
import { isAgencyLikeAccountType } from '@/services/accounts/type';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PublicSwitchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const accountValue = resolvedSearchParams.account;
  const selectedAccount = (Array.isArray(accountValue) ? accountValue[0] : accountValue)?.trim() || null;
  const authAccount = await requireAuth();
  const [account, agencyMappings, brandAccountsResult] = await Promise.all([
    prisma.account.findUnique({
      where: { id: authAccount.aid },
      select: { id: true, displayName: true, displayImage: true, accountType: true },
    }),
    prisma.agencyMap.findMany({
      where: { accountId: authAccount.aid },
      select: { agencyAccountId: true },
      orderBy: { agencyAccountId: 'asc' },
    }),
    getBrandAccounts(),
  ]);
  const accessibleAgencyIds = new Set([
    ...agencyMappings.map(({ agencyAccountId }) => agencyAccountId),
    ...(brandAccountsResult.success ? brandAccountsResult.accounts.map(({ id }) => id) : []),
  ]);
  const agencies = accessibleAgencyIds.size > 0
    ? await prisma.account.findMany({
        where: { id: { in: [...accessibleAgencyIds] } },
        select: { id: true, displayName: true, displayImage: true, accountType: true },
        orderBy: { displayName: 'asc' },
      })
    : [];
  const agencyProfiles = agencies.filter((agency) => isAgencyLikeAccountType(agency.accountType));
  const signedInAccountId = account?.id || authAccount.aid;
  const accountQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (value !== undefined) accountQuery.set(key, Array.isArray(value) ? value[0] : value);
  }
  accountQuery.set('account', signedInAccountId);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Switch Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose your account or an agency profile you can access.</p>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Signed-in Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">The account currently logged in.</p>
        </div>
        <ul className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
          <li>
            <Link
              href={`/switch?${accountQuery.toString()}`}
              aria-current={selectedAccount === signedInAccountId ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none ${selectedAccount === signedInAccountId ? 'bg-primary/10' : ''}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                {account?.displayImage ? <img src={account.displayImage} alt="" className="h-full w-full object-cover" /> : <Layers3 className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{account?.displayName || authAccount.nid || 'Signed-in account'}</span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{account?.accountType || 'Account'} · {account?.id || authAccount.aid}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Agencies You Can Access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Agency profiles available to this account.</p>
        </div>
        {agencyProfiles.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
            {agencyProfiles.map((agency) => (
              <li key={agency.id} className="flex items-center gap-3 px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                  {agency.displayImage ? <img src={agency.displayImage} alt="" className="h-full w-full object-cover" /> : <Layers3 className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{agency.displayName || agency.id}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">{agency.accountType}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
