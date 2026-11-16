import { prisma } from '@neup/core/database/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// Show the most recent competitor source pages recorded by the crawl pipeline.
export default async function IntelligenceUpdatesPage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const pages = await prisma.competitorPage.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { competitor: true, listing: true },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Intelligence Updates</h1><p className="mt-1 text-sm text-muted-foreground">Recent pages recorded from competitor source crawls.</p></div>
      {pages.length === 0 ? <p className="text-sm text-muted-foreground">No updates have been recorded yet.</p> : (
        <div className="space-y-3">{pages.map((page) => (
          <Card key={page.id}><CardHeader className="pb-2"><CardTitle className="text-base">{page.title || 'Untitled page'}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm"><p>{page.competitor.name}{page.listing ? ' · Listing extracted' : ' · Awaiting extraction'}</p><a className="break-all text-primary underline" href={page.source} target="_blank" rel="noreferrer">{page.source}</a><p className="text-muted-foreground">Updated {page.updatedAt.toLocaleString()}</p></CardContent>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
