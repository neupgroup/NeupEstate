'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { randomUUID } from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

export type Competitor = {
  id: string;
  name: string;
  description: string | null;
  crawlRules: string[] | null;
  createdAt: string;
  sources: CompetitorSource[];
};

export type CompetitorSource = {
  id: string;
  competitorId: string;
  type: 'sitemap' | 'link' | 'manual';
  value: string;
};

export type CompetitorPage = {
  id: string;
  competitorId: string;
  title: string;
  description: string | null;
  source: string;
  lastLoggedStatus: string | null;
  lastLoggedOn: string | null;
  details: Record<string, any> | null;
  listedOn: string | null;
  createdAt: string;
};

export type CompetitorListing = {
  id: string;
  competitorPageId: string;
  title: string;
  description: string | null;
  purpose: string;
  agentName: string | null;
  price: any | null;
  priceBasis: string | null;
  isSold: boolean;
  details: Record<string, any> | null;
  loggedOn: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorTracking = {
  id: string;
  competitorPageId: string;
  ourPropertyId: string | null;
};

// ── Competitors ──────────────────────────────────────────────────────────────

export async function getCompetitors(): Promise<Competitor[]> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT c.*, COALESCE(
        json_agg(cs ORDER BY cs."createdAt") FILTER (WHERE cs.id IS NOT NULL),
        '[]'::json
      ) AS sources
      FROM "competitors" c
      LEFT JOIN "competitor_sources" cs ON cs."competitorId" = c.id
      GROUP BY c.id
      ORDER BY c."createdAt" DESC
    `;
    return rows.map(mapCompetitor);
  } catch (e) {
    await logProblem(e, 'getCompetitors');
    return [];
  }
}

export async function getCompetitorById(id: string): Promise<Competitor | null> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT c.*, COALESCE(
        json_agg(cs ORDER BY cs."createdAt") FILTER (WHERE cs.id IS NOT NULL),
        '[]'::json
      ) AS sources
      FROM "competitors" c
      LEFT JOIN "competitor_sources" cs ON cs."competitorId" = c.id
      WHERE c.id = ${id}
      GROUP BY c.id
      LIMIT 1
    `;
    const row = rows[0];
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

// ── Competitor Pages ─────────────────────────────────────────────────────────

export async function getCompetitorPages(competitorId: string): Promise<CompetitorPage[]> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT *
      FROM "competitor_pages"
      WHERE "competitorId" = ${competitorId}
      ORDER BY "createdAt" DESC
    `;
    return rows.map(mapCompetitorPage);
  } catch (e) {
    await logProblem(e, `getCompetitorPages (${competitorId})`);
    return [];
  }
}

export async function upsertCompetitorPage(data: {
  competitorId: string;
  title: string;
  description?: string;
  source: string;
  lastLoggedStatus?: string | null;
  lastLoggedOn?: Date | null;
  details?: Record<string, any>;
  listedOn?: Date;
}): Promise<string> {
  const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "competitor_pages"
    WHERE "competitorId" = ${data.competitorId} AND "source" = ${data.source}
    LIMIT 1
  `;
  const existing = existingRows[0];

  if (existing) {
    await prisma.$executeRaw`
      UPDATE "competitor_pages"
      SET
        "title" = ${data.title},
        "description" = ${data.description},
        "visibleHtml" = NULL,
        "lastLoggedStatus" = ${data.lastLoggedStatus},
        "lastLoggedOn" = ${data.lastLoggedOn},
        "details" = ${data.details as any},
        "listedOn" = ${data.listedOn},
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
    `;
    return existing.id;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "competitor_pages" (
      "id",
      "competitorId",
      "title",
      "description",
      "source",
      "lastLoggedStatus",
      "lastLoggedOn",
      "details",
      "listedOn",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${data.competitorId},
      ${data.title},
      ${data.description},
      ${data.source},
      ${data.lastLoggedStatus},
      ${data.lastLoggedOn},
      ${data.details as any},
      ${data.listedOn},
      NOW(),
      NOW()
    )
    RETURNING "id"
  `;
  return rows[0].id;
}

// ── Tracking ─────────────────────────────────────────────────────────────────

export async function getTrackingForCompetitorPage(
  competitorPageId: string,
): Promise<CompetitorTracking[]> {
  const rows = await prisma.competitorTracking.findMany({ where: { competitorPageId } });
  return rows.map((r) => ({
    id: r.id,
    competitorPageId: r.competitorPageId,
    ourPropertyId: r.ourPropertyId ?? null,
  }));
}

export async function linkToOurProperty(
  competitorPageId: string,
  ourPropertyId: string,
): Promise<string> {
  const row = await prisma.competitorTracking.create({
    data: { competitorPageId, ourPropertyId },
  });
  return row.id;
}

export async function unlinkTracking(id: string): Promise<void> {
  await prisma.competitorTracking.delete({ where: { id } });
}

export async function getCompetitorPageById(id: string): Promise<CompetitorPage | null> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT *
      FROM "competitor_pages"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? mapCompetitorPage(row) : null;
  } catch (e) {
    await logProblem(e, `getCompetitorPageById (${id})`);
    return null;
  }
}

export async function getCompetitorListingByPageId(competitorPageId: string): Promise<CompetitorListing | null> {
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT *
      FROM "competitor_listings"
      WHERE "competitorPageId" = ${competitorPageId}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? mapCompetitorListing(row) : null;
  } catch (e) {
    await logProblem(e, `getCompetitorListingByPageId (${competitorPageId})`);
    return null;
  }
}

export async function upsertCompetitorListing(data: {
  competitorPageId: string;
  title: string;
  description?: string;
  purpose: string;
  agentName?: string;
  price?: any;
  priceBasis?: string;
  isSold?: boolean;
  details?: Record<string, any>;
}): Promise<string> {
  const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "competitor_listings"
    WHERE "competitorPageId" = ${data.competitorPageId}
    LIMIT 1
  `;
  const existing = existingRows[0];

  const payload = {
    title: data.title,
    description: data.description,
    purpose: data.purpose,
    agentName: data.agentName,
    price: data.price,
    priceBasis: data.priceBasis,
    isSold: data.isSold ?? false,
    details: data.details,
  };

  if (existing) {
    await prisma.$executeRaw`
      UPDATE "competitor_listings"
      SET
        "title" = ${payload.title},
        "description" = ${payload.description},
        "purpose" = ${payload.purpose},
        "agentName" = ${payload.agentName},
        "price" = ${payload.price as any},
        "priceBasis" = ${payload.priceBasis},
        "isSold" = ${payload.isSold},
        "details" = ${payload.details as any},
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
    `;
    return existing.id;
  }

  const insertedRows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "competitor_listings" (
      "id",
      "competitorPageId",
      "title",
      "description",
      "purpose",
      "agentName",
      "price",
      "priceBasis",
      "isSold",
      "details",
      "loggedOn",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${data.competitorPageId},
      ${payload.title},
      ${payload.description},
      ${payload.purpose},
      ${payload.agentName},
      ${payload.price as any},
      ${payload.priceBasis},
      ${payload.isSold},
      ${payload.details as any},
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING "id"
  `;
  return insertedRows[0].id;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapCompetitor(row: any): Competitor {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    crawlRules: Array.isArray(row.crawlRules) ? row.crawlRules : (typeof row.crawlRules === 'string' ? JSON.parse(row.crawlRules) : null),
    createdAt: row.createdAt.toISOString(),
    sources: (row.sources ?? []).map((s: any): CompetitorSource => ({
      id: s.id,
      competitorId: s.competitorId,
      type: s.type as CompetitorSource['type'],
      value: s.value,
    })),
  };
}

function mapCompetitorPage(row: any): CompetitorPage {
  return {
    id: row.id,
    competitorId: row.competitorId,
    title: row.title,
    description: row.description ?? null,
    source: row.source,
    lastLoggedStatus: row.lastLoggedStatus ?? null,
    lastLoggedOn: row.lastLoggedOn?.toISOString?.() ?? (row.lastLoggedOn ? new Date(row.lastLoggedOn).toISOString() : null),
    details: row.details ?? null,
    listedOn: row.listedOn?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapCompetitorListing(row: any): CompetitorListing {
  return {
    id: row.id,
    competitorPageId: row.competitorPageId,
    title: row.title,
    description: row.description ?? null,
    purpose: row.purpose,
    agentName: row.agentName ?? null,
    price: row.price ?? null,
    priceBasis: row.priceBasis ?? null,
    isSold: row.isSold,
    details: row.details ?? null,
    loggedOn: row.loggedOn.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
