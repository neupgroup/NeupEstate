import { notFound } from 'next/navigation';
import { getCompetitorById, getCompetitorPages } from '@/services/competitor-service';
import { CompetitionDetailClient } from '../detail-client';

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);

  if (!competitor) notFound();

  const pages = await getCompetitorPages(id);

  return <CompetitionDetailClient competitor={competitor} initialPageUrls={pages.map((page) => page.source)} />;
}
