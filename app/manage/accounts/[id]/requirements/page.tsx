import { getRequirementByUserId } from '@/services/requirements-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function AccountRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const requirements = await getRequirementByUserId(accountId);

  return (
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
                    <Badge variant="outline" className="capitalize text-xs">
                      {r.purpose}
                    </Badge>
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
  );
}
