import { notFound } from 'next/navigation';
import { Card, CardContent } from '@neup/components/ui/card';
import { Link } from '@neup/components/ui/link';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { getRequirementByUserId } from '@/services/requirements/get';
import { getAuthenticatedMeData } from '@/services/auth/me';
import { Plus, Search } from 'lucide-react';
import { DisplayCurrency, DisplayNumber } from '@/components/display-preferences';

/** Extract the NeupID from the @prefixed dynamic route segment. */
function resolveNeupId(routeNeupId: string) {
  const decodedRouteNeupId = decodeURIComponent(routeNeupId);
  if (!decodedRouteNeupId.startsWith('@')) return null;
  const neupId = decodedRouteNeupId.slice(1).trim();
  return neupId || null;
}

/** Show the requirements an account has shared on its public profile. */
export default async function PublicAccountRequirementsPage({
  params,
}: {
  params: Promise<{ neupid: string }>;
}) {
  const { neupid: routeNeupId } = await params;
  const neupId = resolveNeupId(routeNeupId);
  if (!neupId) notFound();

  const account = await getAccountProfileByNeupId(neupId);
  if (!account) notFound();

  const [requirements, me] = await Promise.all([
    getRequirementByUserId(account.profile.id),
    getAuthenticatedMeData(),
  ]);
  const isOwner = me?.accountId === account.profile.id;
  if (!requirements?.length && !isOwner) notFound();
  const visibleRequirements = requirements ?? [];

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Search className="h-4 w-4" /> @{account.profile.neupid}
          </p>
          <h1 className="mt-5 text-4xl font-headline font-semibold tracking-tight sm:text-5xl">Listing requirements</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Listing preferences shared by {account.profile.name}.
          </p>
        </div>
      </section>
      <section className="bg-muted/20 py-12 lg:py-16">
        <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 sm:px-6 md:grid-cols-2 md:px-8 xl:grid-cols-3">
          {visibleRequirements.map((requirement, index) => (
            <Card key={requirement.id} className="bg-card text-card-foreground">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Requirement <DisplayNumber value={index + 1} maximumFractionDigits={0} /></p>
                <p className="mt-2 text-xl font-semibold capitalize">{requirement.purpose || 'Property search'}</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Listing type</dt><dd className="text-right">{requirement.propertyType?.join(', ') || 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Area</dt><dd className="text-right">{requirement.location || 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Budget</dt><dd className="text-right">{requirement.minBudget != null ? <DisplayCurrency amount={requirement.minBudget} sourceCurrency="NPR" /> : 'Any'} – {requirement.maxBudget != null ? <DisplayCurrency amount={requirement.maxBudget} sourceCurrency="NPR" /> : 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Timeline</dt><dd className="text-right">{requirement.requiredTime || 'Flexible'}</dd></div>
                  {requirement.paymentMethod && requirement.paymentMethod.length > 0 && (
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Payment</dt><dd className="text-right">{requirement.paymentMethod.join(', ')}</dd></div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
          {isOwner && (
            <Link href="/requirements/new" className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="flex h-full min-h-56 items-center justify-center border-dashed bg-background/60 transition-colors hover:border-primary hover:bg-primary/5">
                <CardContent className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="h-6 w-6" />
                  </span>
                  <span className="text-lg font-semibold">Add a requirement</span>
                  <span className="mt-2 max-w-xs text-sm text-muted-foreground">Tell us what property you are looking for.</span>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
