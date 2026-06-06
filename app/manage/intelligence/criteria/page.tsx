import { prisma } from '@/logica/core/prisma';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClientLink } from '@/components/client-link';
import { getCurrentAccountId } from '@/app/actions';
import { createIntelligenceCriteriaAction, deleteIntelligenceCriteriaAction } from './actions';
import { Plus, Bell, Trash2, Filter } from 'lucide-react';

const PURPOSE_OPTIONS = ['rent', 'sale', 'sale.auction', 'sale.exchange'] as const;

const TYPE_OPTIONS = ['house', 'land', 'apartment', 'commercial', 'other'] as const;

export default async function IntelligenceCriteriaPage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const accountId = await getCurrentAccountId();

  const [criteria, alerts, competitors] = accountId
    ? await Promise.all([
        prisma.intelligenceMapping.findMany({
          where: { accountId },
          orderBy: { createdAt: 'desc' },
          include: { competitor: true },
        }),
        prisma.intelligenceAlert.findMany({
          where: { accountId },
          orderBy: { createdAt: 'desc' },
          include: {
            mapping: true,
            competitor: true,
          },
        }),
        prisma.competitor.findMany({
          orderBy: { createdAt: 'desc' },
        }),
      ])
    : [[], [], []];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Filter className="h-6 w-6" />
          Intelligence Criteria
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the criteria that should trigger alerts for your account. Location and purpose are required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Criteria</CardTitle>
          <CardDescription>
            Create multiple criteria rows. Each account can have more than one saved rule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createIntelligenceCriteriaAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Location *</label>
              <Input name="cLocation" placeholder="Kathmandu, Lalitpur, Pokhara..." required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose *</label>
              <select name="cPurpose" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select purpose</option>
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Budget</label>
              <Input name="cMinBudget" type="number" min="0" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Budget</label>
              <Input name="cMaxBudget" type="number" min="0" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Competitor</label>
              <select name="cCompetitorId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Any competitor</option>
                {competitors.map((competitor) => (
                  <option key={competitor.id} value={competitor.id}>{competitor.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select name="cType" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Any type</option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Save Criteria
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Criteria</CardTitle>
            <CardDescription>Your current alert rules.</CardDescription>
          </CardHeader>
          <CardContent>
            {criteria.length === 0 ? (
              <p className="text-sm text-muted-foreground">No criteria saved yet.</p>
            ) : (
              <div className="space-y-3">
                {criteria.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{item.cPurpose}</Badge>
                        {item.cType && <Badge variant="outline">{item.cType}</Badge>}
                      </div>
                      <p className="text-sm font-medium">{item.cLocation}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.cMinBudget || item.cMaxBudget
                          ? `${item.cMinBudget ? item.cMinBudget.toLocaleString() : 'Any'} - ${item.cMaxBudget ? item.cMaxBudget.toLocaleString() : 'Any'}`
                          : 'Any budget'}
                      </p>
                      {item.competitor && (
                        <p className="text-sm text-muted-foreground">Competitor: {item.competitor.name}</p>
                      )}
                    </div>
                    <form action={deleteIntelligenceCriteriaAction.bind(null, item.id)}>
                      <Button variant="ghost" size="icon" type="submit" aria-label="Delete criteria">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alerts</CardTitle>
            <CardDescription>Matches created from saved criteria.</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No alerts have been generated yet. They will appear here once a listing matches one of your criteria.
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-medium">{alert.competitor.name}</span>
                      <Badge variant="secondary">{alert.status || 'pending'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rule: {alert.mapping.cPurpose} {alert.mapping.cLocation ? `· ${alert.mapping.cLocation}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Back to{' '}
        <ClientLink href="/manage/intelligence" className="text-primary underline">
          Intelligence
        </ClientLink>
        .
      </p>
    </div>
  );
}
