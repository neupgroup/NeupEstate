import { Link } from '@neup/components/ui/link';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { prisma } from '@neup/core/database/prisma';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// Create a lowercase, URL-safe slug from a competitor name.
function createCompetitorSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'competitor';
}

// Summarize configured competitors and link to their management views.
export default async function CompetitorsHomePage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const competitors = await prisma.competitor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { listings: true, sources: true } } },
  });
  const sections = [
    { href: '/manage/competitors/listings', title: 'Listings', description: 'Property listings extracted from competitor sources.' },
    { href: '/manage/competitors/sales', title: 'Sales', count: 0, description: 'Listings marked as sold.' },
    { href: '/manage/competitors/activity', title: 'Activity', description: 'Review activity for configured competitors.' },
  ];
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Competitors</h1><p className="mt-1 text-sm text-muted-foreground">{competitors.length} configured competitors.</p></div><div className="grid gap-4 md:grid-cols-3">{sections.map((section) => <Link key={section.href} href={section.href}><Card className="h-full hover:border-primary"><CardHeader><CardTitle>{section.title}</CardTitle></CardHeader><CardContent><p className="mt-1 text-sm text-muted-foreground">{section.description}</p></CardContent></Card></Link>)}</div><div className="space-y-3"><h2 className="text-lg font-semibold">Configured Competitors</h2>{competitors.length ? competitors.map((competitor) => <Link key={competitor.id} href={`/manage/competitors/${createCompetitorSlug(competitor.name)}--${competitor.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="transition-colors hover:border-primary"><CardHeader className="pb-2"><CardTitle className="text-base">{competitor.name}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{competitor._count.sources} sources · {competitor._count.listings} listings{competitor.description ? ` · ${competitor.description}` : ''}</CardContent></Card></Link>) : <p className="text-sm text-muted-foreground">No competitors have been added yet.</p>}</div><Link href="/manage/intelligence/competition" className="text-primary underline">Manage competitor sources</Link></div>;
}
