import { notFound } from 'next/navigation';
import { getCompetitorById, getCompetitorProperties } from '@/services/competitor-service';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft, Globe, Edit2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/manage/pagination';

export default async function CompetitorListingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>>; }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);

  if (!competitor) notFound();

  const properties = await getCompetitorProperties(id as string);

  // Pagination
  const resolvedSearchParams = await searchParams;
  const pageParam = Array.isArray(resolvedSearchParams?.page) ? resolvedSearchParams.page[0] : (resolvedSearchParams?.page as string | undefined);
  const currentPage = Math.max(1, Number(pageParam ?? '1'));
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const currentProperties = properties.slice(start, start + pageSize);

  return (
    <div className="space-y-6">
      <ClientLink href="/manage/intelligence/listings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to Listings
      </ClientLink>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> {competitor.name}
          </h2>
          {competitor.description && (
            <p className="text-sm text-muted-foreground mt-1">{competitor.description}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">{properties.length} property{properties.length !== 1 ? 'ies' : ''}</div>
      </div>

      <div className="space-y-4">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>

          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties discovered for this competitor yet.</p>
          ) : (
            <div className="rounded-lg border divide-y overflow-hidden">
              {currentProperties.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-4 gap-4 hover:bg-muted/5">
                  <div className="flex-1">
                    <a href={p.source} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline block">{p.title}</a>
                    <p className="text-sm text-muted-foreground mt-1">{p.description ?? '—'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-muted-foreground mb-2">{p.listedOn ? new Date(p.listedOn).toLocaleDateString() : '—'}</div>
                    <a href={p.source} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination totalPages={totalPages} currentPage={currentPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
