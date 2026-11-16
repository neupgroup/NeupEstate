import { prisma } from '@neup/core/database/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// Show recent crawled pages as the competitor activity feed.
export default async function CompetitorActivityPage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const activity = await prisma.competitorPage.findMany({ orderBy: { updatedAt: 'desc' }, take: 50, include: { competitor: true, listing: true } });
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Competitor Activity</h1><p className="mt-1 text-sm text-muted-foreground">Recent pages found and processed from competitor sources.</p></div>{activity.length ? <div className="space-y-3">{activity.map((page) => <Card key={page.id}><CardHeader className="pb-2"><CardTitle className="text-base">{page.title || 'Untitled page'}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>{page.competitor.name} · {page.listing ? 'Listing extracted' : 'Page discovered'}</p><p className="text-muted-foreground">{(page.lastLoggedOn ?? page.updatedAt).toLocaleString()}</p><a href={page.source} target="_blank" rel="noreferrer" className="break-all text-primary underline">{page.source}</a></CardContent></Card>)}</div> : <p className="text-sm text-muted-foreground">No competitor activity has been recorded.</p>}</div>;
}
