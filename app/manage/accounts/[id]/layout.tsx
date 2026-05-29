import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getAccountById } from '@/services/account-service';
import { getRequirementByUserId } from '@/services/requirements-service';
import { getSavedProperties, getPaginatedProperties } from '@/services/property-service';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/services/auth/account';
import { logProblem } from '@/services/problem-service';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, User, ShieldAlert, CalendarDays, Clock, BadgeCheck } from 'lucide-react';

export default async function ManageAccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const authAccount = await requireAuth();
  const { id: accountId } = await params;

  const account = await getAccountById(accountId);
  if (!account) {
    await logProblem(
      new Error(`Account not found in local DB: ${accountId}`),
      'manage/accounts/[id]:account_not_found',
      { accountId, authAid: authAccount.aid },
    );
    notFound();
  }

  const [requirements, savedProperties, ownedProperties, activityCount] = await Promise.all([
    getRequirementByUserId(accountId),
    account.registered ? getSavedProperties(accountId) : Promise.resolve([]),
    getPaginatedProperties({ ownerAccountId: accountId, includeInactive: true, limit: 1 }),
    prisma.activity.count({ where: { trackerId: accountId } }),
  ]);

  const isRegistered = account.registered;

  return (
    <div className="space-y-6">
      <ClientLink
        href="/manage/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Accounts
      </ClientLink>

      <div className="rounded-3xl border bg-card/80 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5 min-w-0">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-muted">
              {account.display_image ? (
                <Image
                  src={account.display_image}
                  alt={account.display_name ?? 'Account avatar'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-semibold leading-tight">
                  {account.display_name ?? 'Unnamed Account'}
                </h2>
                {isRegistered && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />}
                <Badge variant={isRegistered ? 'default' : 'secondary'} className="capitalize">
                  {account.account_type}
                </Badge>
              </div>

              <p className="break-all font-mono text-xs text-muted-foreground">{account.id}</p>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {isRegistered ? 'Registered' : 'Guest'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(account.created_on).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(account.accessed_on).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>


            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[440px]">
            {[
              { label: 'Saved', value: savedProperties.length },
              { label: 'Properties', value: ownedProperties.totalCount },
              { label: 'Requirements', value: requirements?.length ?? 0 },
              { label: 'Activity', value: activityCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border bg-muted/30 px-4 py-3 text-center">
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div>{children}</div>
    </div>
  );
}
