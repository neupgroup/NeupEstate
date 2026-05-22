import React from 'react'

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Competition</h1>
      <p>Competition ID: {params.id}</p>
      <p>Route: /manage/intelligence/competition/{params.id}</p>
    </div>
  )
}
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
