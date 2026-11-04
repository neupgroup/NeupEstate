import { notFound } from 'next/navigation';
import { Card, CardContent } from '@neup/components/ui/card';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { getRequirementByUserId } from '@/services/requirements/get';
import { Search } from 'lucide-react';

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

  const requirements = await getRequirementByUserId(account.profile.id);
  if (!requirements?.length) notFound();

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
          {requirements.map((requirement, index) => (
            <Card key={requirement.id} className="bg-card text-card-foreground">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Requirement {index + 1}</p>
                <p className="mt-2 text-xl font-semibold capitalize">{requirement.purpose || 'Property search'}</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Listing type</dt><dd className="text-right">{requirement.propertyType?.join(', ') || 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Area</dt><dd className="text-right">{requirement.location || 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Budget</dt><dd className="text-right">{requirement.minBudget?.toLocaleString() || 'Any'} – {requirement.maxBudget?.toLocaleString() || 'Any'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Timeline</dt><dd className="text-right">{requirement.requiredTime || 'Flexible'}</dd></div>
                  {requirement.paymentMethod && requirement.paymentMethod.length > 0 && (
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Payment</dt><dd className="text-right">{requirement.paymentMethod.join(', ')}</dd></div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
