import { prisma } from '@/core/database/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export default async function AccountActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const recentActivity = await prisma.activity.findMany({
    where: { accountId },
    orderBy: { activityOn: 'desc' },
    take: 20,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Activity
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
  );
}
