import { Badge } from '@/components/ui/badge';

type Activity = {
    id: string;
    leadId: string;
    data: any;
    activityOn: Date;
    activityBy: string;
};

type Lead = {
    id: string;
    type: string;
    priority: string;
};

interface ActivityListProps {
    activities: Activity[];
    leads?: Lead[];
    showLead?: boolean;
}

export function ActivityList({ activities, leads = [], showLead = false }: ActivityListProps) {
    const leadMap = Object.fromEntries(leads.map((l) => [l.id, l]));

    if (activities.length === 0) {
        return <p className="text-sm text-muted-foreground py-12 text-center">No activity recorded yet.</p>;
    }

    return (
        <div className="space-y-0 divide-y divide-border rounded-lg border overflow-hidden">
            {activities.map((a) => {
                const lead = leadMap[a.leadId];
                const data = a.data as Record<string, any>;
                return (
                    <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                        {/* Timeline dot */}
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />

                        <div className="flex-1 min-w-0 space-y-1">
                            {/* Data */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {Object.entries(data)
                                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                    .map(([k, v]) => (
                                        <span key={k} className="text-sm">
                                            <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                                            <span className="font-medium">{String(v)}</span>
                                        </span>
                                    ))}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {new Date(a.activityOn).toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">by {a.activityBy}</span>
                                {showLead && lead && (
                                    <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-[11px] py-0">{lead.type}</Badge>
                                        <Badge variant="outline" className="text-[11px] py-0 capitalize">{lead.priority.toLowerCase()}</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
