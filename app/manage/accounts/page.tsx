import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getAccountById } from '@/services/account-service';
import { getAccountInformation } from '@/services/account/lookup';
import { getRequirementByUserId } from '@/services/requirements-service';
import { getSavedProperties, getPaginatedProperties } from '@/services/property-service';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/services/auth/account';
import { ClientLink } from '@/components/client-link';
import { AccountRefreshButton } from '@/components/manage/account-refresh-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  User,
  ShieldAlert,
  Activity,
  Home,
  Target,
  Clock,
  CalendarDays,
  AtSign,
  BadgeCheck,
  SearchX,
} from 'lucide-react';

// ─── Resolve which account to display ────────────────────────────────────────
//
// Priority:
//   1. ?accountId=  — explicit UUID (must be owned by authenticated user)
//   2. ?neupId=     — resolved via NeupID HTTP lookup
//   3. (no params)  — the logged-in user's aid from the verified auth_account cookie
//
// The authenticated account is verified by the server-side requireAuth() guard,
// which uses the middleware-verified JWT signature (AUTH_PUBLIC_KEY).

async function resolveTarget(
  qAccountId: string | undefined,
  qNeupId: string | undefined,
  authenticatedAccountId: string,
): Promise<{ accountId: string; neupIdHandle: string | null } | null> {
  // 1. Explicit accountId
  if (qAccountId?.trim()) {
    return { accountId: qAccountId.trim(), neupIdHandle: null };
  }

  // 2. neupId — resolve to accountId via NeupID
  if (qNeupId?.trim()) {
    const info = await getAccountInformation({ neupId: qNeupId.trim() });
    if (!info.found) return null;
    return { accountId: info.account.accountId, neupIdHandle: qNeupId.trim() };
  }

  // 3. Default — use the authenticated user from the verified session
  return { accountId: authenticatedAccountId, neupIdHandle: null };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManageAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; neupId?: string }>;
}) {
  // Require authentication first — redirects to login if not authenticated
  const authAccount = await requireAuth();
  
  const { accountId: qAccountId, neupId: qNeupId } = await searchParams;

  const resolved = await resolveTarget(qAccountId, qNeupId, authAccount.aid);
  if (!resolved) {
    return <AccountNotFound query={qAccountId ?? qNeupId ?? ''} />;
  }

  const { accountId, neupIdHandle } = resolved;

  const account = await getAccountById(accountId);
  if (!account) {
    return <AccountNotFound query={accountId} />;
  }

  const [requirements, savedProperties, ownedProperties, recentActivity] =
    await Promise.all([
      getRequirementByUserId(accountId),
      account.registered ? getSavedProperties(accountId) : Promise.resolve([]),
      getPaginatedProperties({ ownerAccountId: accountId, includeInactive: true, limit: 10 }),
      prisma.activity.findMany({
        where: { trackerId: accountId },
        orderBy: { activityOn: 'desc' },
        take: 20,
      }),
    ]);

  const isRegistered = account.registered;

  return (
    <div className="space-y-8">
      {/* Back */}
      <ClientLink
        href="/manage/users"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Users
      </ClientLink>

      {/* ── Header ── */}
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden bg-muted border">
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
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold leading-tight truncate">
              {account.display_name ?? 'Unnamed Account'}
            </h2>
            {isRegistered && (
              <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
            )}
            <Badge variant={isRegistered ? 'default' : 'secondary'} className="capitalize">
              {account.account_type}
            </Badge>
          </div>

          {/* NeupID handle — only shown for registered accounts */}
          {neupIdHandle && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <AtSign className="h-3.5 w-3.5" />
              <span>{neupIdHandle.replace(/^@/, '')}</span>
            </div>
          )}

          <p className="font-mono text-xs text-muted-foreground break-all">{account.id}</p>

          {/* Download — refresh display info from NeupID */}
          <div className="pt-1">
            <AccountRefreshButton
              accountId={account.id}
              currentDisplayName={account.display_name}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

        {/* ── Left — account info ── */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account Info
          </h3>
          <div className="rounded-lg border divide-y overflow-hidden text-sm">
            {[
              {
                label: 'Status',
                value: isRegistered ? 'Registered' : 'Guest',
                icon: <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />,
              },
              {
                label: 'Created',
                value: new Date(account.created_on).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                }),
                icon: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />,
              },
              {
                label: 'Last seen',
                value: new Date(account.accessed_on).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                }),
                icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
              },
              ...(neupIdHandle
                ? [{
                    label: 'NeupID',
                    value: neupIdHandle.replace(/^@/, ''),
                    icon: <AtSign className="h-3.5 w-3.5 text-muted-foreground" />,
                  }]
                : []),
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center px-4 py-3 gap-3">
                {icon}
                <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                <span className="text-sm break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Saved',        value: savedProperties.length },
              { label: 'Properties',   value: ownedProperties.totalCount },
              { label: 'Requirements', value: requirements?.length ?? 0 },
              { label: 'Activity',     value: recentActivity.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border px-4 py-3 text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — data panels ── */}
        <div className="space-y-6">

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
              ) : (
                <div className="divide-y">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 pt-0.5">
                        {new Date(a.activityOn).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {typeof a.details === 'object'
                            ? JSON.stringify(a.details)
                            : String(a.details)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Properties */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                Properties
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {ownedProperties.totalCount} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ownedProperties.properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties linked to this account.</p>
              ) : (
                <div className="space-y-2">
                  {ownedProperties.properties.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border px-4 py-3 gap-4"
                    >
                      <div className="min-w-0">
                        <ClientLink
                          href={`/manage/properties/${p.id}`}
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {p.title}
                        </ClientLink>
                        <p className="text-xs text-muted-foreground capitalize">
                          {p.category} · {p.purpose}
                        </p>
                      </div>
                      <Badge
                        variant={p.isApproved ? 'default' : 'secondary'}
                        className="shrink-0 capitalize text-xs"
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Requirements
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {requirements?.length ?? 0} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!requirements || requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requirements saved.</p>
              ) : (
                <div className="space-y-3">
                  {requirements.map((r) => (
                    <div key={r.id} className="rounded-md border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                        {r.purpose && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {r.purpose}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          r.location     && { label: 'Location',   value: r.location },
                          r.minBudget    && { label: 'Min budget',  value: r.minBudget.toLocaleString() },
                          r.maxBudget    && { label: 'Max budget',  value: r.maxBudget.toLocaleString() },
                          r.urgency      && { label: 'Urgency',     value: r.urgency },
                          r.requiredTime && { label: 'Timeline',    value: r.requiredTime },
                          r.loan         && { label: 'Loan',        value: 'Yes' },
                        ]
                          .filter(Boolean)
                          .map((item: any) => (
                            <div key={item.label} className="rounded bg-muted/40 px-3 py-2">
                              <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
                              <p className="text-sm font-medium truncate">{item.value}</p>
                            </div>
                          ))}
                        {(r.propertyType?.length ?? 0) > 0 && (
                          <div className="rounded bg-muted/40 px-3 py-2 col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-muted-foreground mb-0.5">Type</p>
                            <p className="text-sm font-medium truncate">{r.propertyType?.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// ─── Not found ────────────────────────────────────────────────────────────────

function AccountNotFound({ query }: { query: string }) {
  return (
    <div className="space-y-4">
      <ClientLink
        href="/manage/users"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Users
      </ClientLink>
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Account not found</p>
        {query && <p className="text-sm text-muted-foreground font-mono">{query}</p>}
      </div>
    </div>
  );
}
