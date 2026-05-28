import { notFound } from 'next/navigation';
import { getCompetitorById, getCompetitorProperties } from '@/services/competitor-service';
import { CompetitionDetailClient } from '../detail-client';

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);

  if (!competitor) notFound();

  const properties = await getCompetitorProperties(id);

  return <CompetitionDetailClient competitor={competitor} initialPropertyUrls={properties.map((property) => property.source)} />;
}
