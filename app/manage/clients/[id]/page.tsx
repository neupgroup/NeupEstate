import { notFound } from 'next/navigation';
import { ArrowUpRight, CalendarDays, ChevronLeft, Clock3, Mail, Phone, Plus, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClientLink } from '@/components/client-link';
import { getClientById } from '@/services/lead-service';
import { checkAuthenticationForWeb, getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

type RequirementValue = string | number | boolean | null | undefined | Array<string | number>;

function formatDate(value: string | Date) {
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatDateTime(value: string | Date) {
    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatLabel(value: string) {
    return value
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRequirementValue(value: RequirementValue) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

function priorityVariant(priority: string): 'secondary' | 'default' | 'destructive' {
    const normalized = priority.toLowerCase();
    if (normalized === 'urgent' || normalized === 'high') return 'destructive';
    if (normalized === 'medium') return 'default';
    return 'secondary';
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    await requirePagePermission(PERMISSIONS.manage.selfClientView);
    await checkAuthenticationForWeb();

    const accountId = await getAccountIdFromJWT();
    const client = await getClientById(id, accountId!);

    if (!client) notFound();

    const contact = (client.contact ?? {}) as { phone?: string | null; email?: string | null };
    const recentActivities = client.leads
        .flatMap((lead) =>
            (lead.activities ?? []).map((activity) => ({
                ...activity,
                leadId: lead.id,
                leadType: lead.type,
                leadPriority: lead.priority,
            })),
        )
        .sort((a, b) => new Date(b.activityOn).getTime() - new Date(a.activityOn).getTime())
        .slice(0, 6);

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <ClientLink
                    href="/manage/clients"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Clients
                </ClientLink>

                <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UserRound className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    {client.firstName} {client.lastName}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Client since {formatDate(client.createdAt)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{client.leads.length} lead{client.leads.length !== 1 ? 's' : ''}</Badge>
                            {client.source ? <Badge variant="secondary">{client.source}</Badge> : null}
                            {contact.phone ? <Badge variant="outline">{contact.phone}</Badge> : null}
                            {contact.email ? <Badge variant="outline">{contact.email}</Badge> : null}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <ClientLink href={`/manage/clients/${client.id}/activity`}>
                            <Button variant="outline">
                                <Clock3 className="h-4 w-4" />
                                View Activity
                            </Button>
                        </ClientLink>
                        <ClientLink href="/manage/leads/create">
                            <Button>
                                <Plus className="h-4 w-4" />
                                New Lead
                            </Button>
                        </ClientLink>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardDescription>Total Leads</CardDescription>
                        <CardTitle>{client.leads.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardDescription>Last Updated</CardDescription>
                        <CardTitle className="text-lg">{formatDate(client.updatedAt)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardDescription>Recent Activity</CardDescription>
                        <CardTitle>{recentActivities.length}</CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Contact Details</CardTitle>
                            <CardDescription>Primary CRM contact information for this client.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                                    <p className="break-all text-sm font-medium">{contact.phone || 'Not added'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                                    <p className="break-all text-sm font-medium">{contact.email || 'Not added'}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead Source</p>
                                    <p className="text-sm font-medium">{client.source || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                                    <p className="text-sm font-medium">{formatDateTime(client.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                                    <p className="text-sm font-medium">{formatDateTime(client.updatedAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <CardDescription>Latest events across all linked leads.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentActivities.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivities.map((activity) => {
                                        const data = (activity.data ?? {}) as Record<string, unknown>;
                                        const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== '');

                                        return (
                                            <div key={activity.id} className="rounded-xl border p-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{activity.leadType}</Badge>
                                                    <Badge variant={priorityVariant(activity.leadPriority)} className="capitalize">
                                                        {activity.leadPriority.toLowerCase()}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDateTime(activity.activityOn)}
                                                    </span>
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    {entries.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">No activity details captured.</p>
                                                    ) : (
                                                        entries.map(([key, value]) => (
                                                            <div key={key} className="text-sm">
                                                                <span className="text-muted-foreground">{formatLabel(key)}: </span>
                                                                <span className="font-medium">{String(value)}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Leads</CardTitle>
                                <CardDescription>All leads currently associated with this client.</CardDescription>
                            </div>
                            <ClientLink href={`/manage/clients/${client.id}/activity`} className="text-sm text-primary hover:underline">
                                <span className="inline-flex items-center gap-1">
                                    Full activity log
                                    <ArrowUpRight className="h-4 w-4" />
                                </span>
                            </ClientLink>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {client.leads.length === 0 ? (
                            <div className="rounded-xl border border-dashed px-6 py-12 text-center">
                                <p className="text-sm text-muted-foreground">No leads yet for this client.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {client.leads.map((lead) => {
                                    const requirementEntries = Object.entries((lead.requirement ?? {}) as Record<string, RequirementValue>)
                                        .filter(([, value]) => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0));

                                    return (
                                        <div key={lead.id} className="rounded-2xl border p-5">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline">{lead.type}</Badge>
                                                        <Badge variant={priorityVariant(lead.priority)} className="capitalize">
                                                            {lead.priority.toLowerCase()}
                                                        </Badge>
                                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            Created {formatDate(lead.createdAt)}
                                                        </span>
                                                    </div>

                                                    {lead.leadOwner ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            Lead owner: <span className="font-medium text-foreground">{lead.leadOwner}</span>
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div className="text-sm text-muted-foreground">
                                                    {lead.activities.length} activit{lead.activities.length === 1 ? 'y' : 'ies'}
                                                </div>
                                            </div>

                                            <Separator className="my-4" />

                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-sm font-medium">Requirements</h3>
                                                    {requirementEntries.length === 0 ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">No requirement details saved.</p>
                                                    ) : (
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                            {requirementEntries.map(([key, value]) => (
                                                                <div key={key} className="rounded-xl bg-muted/40 px-4 py-3">
                                                                    <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                                        {formatLabel(key)}
                                                                    </p>
                                                                    <p className="text-sm font-medium">
                                                                        {formatRequirementValue(value)}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-medium">Latest Activity</h3>
                                                    {lead.activities.length === 0 ? (
                                                        <p className="mt-2 text-sm text-muted-foreground">No activity recorded for this lead.</p>
                                                    ) : (
                                                        <div className="mt-3 space-y-3">
                                                            {lead.activities.slice(0, 3).map((activity) => {
                                                                const entries = Object.entries((activity.data ?? {}) as Record<string, unknown>)
                                                                    .filter(([, value]) => value !== null && value !== undefined && value !== '');

                                                                return (
                                                                    <div key={activity.id} className="rounded-xl border border-border/70 p-4">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {formatDateTime(activity.activityOn)}
                                                                            </span>
                                                                            {activity.activityBy ? (
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    by {activity.activityBy}
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {entries.length === 0 ? (
                                                                            <p className="mt-2 text-sm text-muted-foreground">No structured activity data.</p>
                                                                        ) : (
                                                                            <div className="mt-3 space-y-1.5">
                                                                                {entries.map(([key, value]) => (
                                                                                    <div key={key} className="text-sm">
                                                                                        <span className="text-muted-foreground">
                                                                                            {formatLabel(key)}:
                                                                                        </span>{' '}
                                                                                        <span className="font-medium">{String(value)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
