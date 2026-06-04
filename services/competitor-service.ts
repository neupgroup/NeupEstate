'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';

// ── Types ────────────────────────────────────────────────────────────────────

export type Competitor = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  sources: CompetitorSource[];
};

export type CompetitorSource = {
  id: string;
  competitorId: string;
  type: 'sitemap' | 'link' | 'manual';
  value: string;
};

export type CompetitorProperty = {
  id: string;
  competitorId: string;
  title: string;
  description: string | null;
  source: string;
  details: Record<string, any> | null;
  listedOn: string | null;
  createdAt: string;
};

export type CompetitorTracking = {
  id: string;
  competitorPropertyId: string;
  ourPropertyId: string | null;
};

// ── Competitors ──────────────────────────────────────────────────────────────

export async function getCompetitors(): Promise<Competitor[]> {
  try {
    const rows = await prisma.competitor.findMany({
      include: { sources: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapCompetitor);
  } catch (e) {
    await logProblem(e, 'getCompetitors');
    return [];
  }
}

export async function getCompetitorById(id: string): Promise<Competitor | null> {
  try {
    const row = await prisma.competitor.findUnique({
      where: { id },
      include: { sources: true },
    });
    return row ? mapCompetitor(row) : null;
  } catch (e) {
    await logProblem(e, `getCompetitorById (${id})`);
    return null;
  }
}

export async function createCompetitor(name: string, description?: string): Promise<string> {
  const row = await prisma.competitor.create({ data: { name, description } });
  return row.id;
}

export async function deleteCompetitor(id: string): Promise<void> {
  await prisma.competitor.delete({ where: { id } });
}

// ── Sources ──────────────────────────────────────────────────────────────────

export async function addCompetitorSource(
  competitorId: string,
  type: 'sitemap' | 'link' | 'manual',
  value: string,
): Promise<string> {
  const row = await prisma.competitorSource.create({ data: { competitorId, type, value } });
  return row.id;
}

export async function deleteCompetitorSource(id: string): Promise<void> {
  await prisma.competitorSource.delete({ where: { id } });
}

// ── Competitor Properties ────────────────────────────────────────────────────

export async function getCompetitorProperties(competitorId: string): Promise<CompetitorProperty[]> {
  try {
    const rows = await prisma.competitorProperty.findMany({
      where: { competitorId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapCompetitorProperty);
  } catch (e) {
    await logProblem(e, `getCompetitorProperties (${competitorId})`);
    return [];
  }
}

export async function upsertCompetitorProperty(data: {
  competitorId: string;
  title: string;
  description?: string;
  source: string;
  details?: Record<string, any>;
  listedOn?: Date;
}): Promise<string> {
  const existing = await prisma.competitorProperty.findFirst({
    where: { competitorId: data.competitorId, source: data.source },
    select: { id: true },
  });

  if (existing) {
    await prisma.competitorProperty.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        details: data.details,
        listedOn: data.listedOn,
      },
    });
    return existing.id;
  }

  const row = await prisma.competitorProperty.create({ data });
  return row.id;
}

// ── Tracking ─────────────────────────────────────────────────────────────────

export async function getTrackingForCompetitorProperty(
  competitorPropertyId: string,
): Promise<CompetitorTracking[]> {
  const rows = await prisma.competitorTracking.findMany({ where: { competitorPropertyId } });
  return rows.map((r) => ({
    id: r.id,
    competitorPropertyId: r.competitorPropertyId,
    ourPropertyId: r.ourPropertyId ?? null,
  }));
}

export async function linkToOurProperty(
  competitorPropertyId: string,
  ourPropertyId: string,
): Promise<string> {
  const row = await prisma.competitorTracking.create({
    data: { competitorPropertyId, ourPropertyId },
  });
  return row.id;
}

export async function unlinkTracking(id: string): Promise<void> {
  await prisma.competitorTracking.delete({ where: { id } });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapCompetitor(row: any): Competitor {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt.toISOString(),
    sources: (row.sources ?? []).map((s: any): CompetitorSource => ({
      id: s.id,
      competitorId: s.competitorId,
      type: s.type as CompetitorSource['type'],
      value: s.value,
    })),
  };
}

function mapCompetitorProperty(row: any): CompetitorProperty {
  return {
    id: row.id,
    competitorId: row.competitorId,
    title: row.title,
    description: row.description ?? null,
    source: row.source,
    details: row.details ?? null,
    listedOn: row.listedOn?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
