import { prisma } from '@neup/core/database/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// List competitor listings currently marked as sold.
export default async function CompetitorSalesPage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const sales = await prisma.competitorListing.findMany({ where: { isSold: true }, orderBy: { updatedAt: 'desc' }, include: { competitor: true } });
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Competitor Sales</h1><p className="mt-1 text-sm text-muted-foreground">Listings marked as sold in competitor data.</p></div>{sales.length ? <div className="space-y-3">{sales.map((sale) => <Card key={sale.id}><CardHeader><CardTitle className="text-base">{sale.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{sale.competitor.name} · Updated {sale.updatedAt.toLocaleString()}</CardContent></Card>)}</div> : <p className="text-sm text-muted-foreground">No sold competitor listings are recorded.</p>}</div>;
}
