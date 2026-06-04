import { prisma } from '@/logica/core/prisma';
import { getAccountById } from '@/services/account-service';
import { getRequirementByUserId } from '@/services/requirements-service';
import { getSavedProperties, getPaginatedProperties } from '@/services/property-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPropertyRow } from '@/components/manage/property-row';
import { Activity, Bookmark, Home, Target } from 'lucide-react';
import { AccountRefreshButton } from '@/components/manage/account-refresh-button';
import { DeleteAccountButton } from '@/components/manage/delete-account-button';
import { fetchApplicationUsers } from "@/services/neupid/application-users";

export default async function ManageAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const account = await getAccountById(accountId);

  const [requirements, savedProperties, ownedProperties, recentActivity, remoteUsersResult] = await Promise.all([
    getRequirementByUserId(accountId),
    account?.registered ? getSavedProperties(accountId) : Promise.resolve([]),
    getPaginatedProperties({ ownerAccountId: accountId, includeInactive: true, limit: 50 }),
    prisma.activity.findMany({
      where: { trackerId: accountId },
      orderBy: { activityOn: 'desc' },
      take: 20,
    }),
    fetchApplicationUsers({ offset: 0, limit: 200 }),
  ]);

  const isSynced = remoteUsersResult.success && remoteUsersResult.users.some(u => u.accountId === accountId);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Activity</h3>
          <p className="text-xs text-muted-foreground">Latest interactions and events for this account.</p>
        </div>
        <Card className="shadow-sm">
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
                    <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                      {new Date(a.activityOn).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {typeof a.details === 'object' ? JSON.stringify(a.details) : String(a.details)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Properties</h3>
          <p className="text-xs text-muted-foreground">Listings linked to this account.</p>
        </div>
        <Card className="shadow-sm">
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
              <div className="divide-y overflow-hidden rounded-lg border">
                {ownedProperties.properties.map((property) => (
                  <AdminPropertyRow key={property.id} property={property} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Requirements</h3>
          <p className="text-xs text-muted-foreground">Saved preferences and needs.</p>
        </div>
        <Card className="shadow-sm">
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
                  <div key={r.id} className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {r.purpose && (
                        <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                          {r.purpose}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        r.location && { label: 'Location', value: r.location },
                        r.minBudget && { label: 'Min budget', value: r.minBudget.toLocaleString() },
                        r.maxBudget && { label: 'Max budget', value: r.maxBudget.toLocaleString() },
                        r.urgency && { label: 'Urgency', value: r.urgency },
                        r.requiredTime && { label: 'Timeline', value: r.requiredTime },
                        r.loan && { label: 'Loan', value: 'Yes' },
                      ]
                        .filter(Boolean)
                        .map((item: any) => (
                          <div key={item.label} className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="mb-0.5 text-[11px] text-muted-foreground">{item.label}</p>
                            <p className="truncate text-sm font-medium">{item.value}</p>
                          </div>
                        ))}
                      {(r.propertyType?.length ?? 0) > 0 && (
                        <div className="col-span-2 rounded-lg bg-muted/40 px-3 py-2 sm:col-span-1">
                          <p className="mb-0.5 text-[11px] text-muted-foreground">Type</p>
                          <p className="truncate text-sm font-medium">{r.propertyType?.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Saved</h3>
          <p className="text-xs text-muted-foreground">Properties bookmarked by the account.</p>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bookmark className="h-4 w-4" />
              Saved Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved properties.</p>
            ) : (
              <div className="divide-y overflow-hidden rounded-lg border">
                {savedProperties.map((property) => (
                  <AdminPropertyRow key={property.id} property={property} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="pt-8 flex flex-wrap items-center gap-3">
        <AccountRefreshButton accountId={accountId} currentDisplayName={account?.display_name} />
        {!isSynced && (
          <DeleteAccountButton accountId={accountId} displayName={account?.display_name} />
        )}
      </section>
    </div>
  );
}
