import { randomUUID } from 'crypto';
import { Prisma } from '@/core/database/prisma';
import type { NextRequest } from 'next/server';
import { prisma } from '@/core/database/prisma';
import type { SiteDevLogEntry, SiteDevLogSetting, SiteDevLogSource } from '@/types';

const SETTINGS_CACHE_TTL_MS = 5_000;
const BODY_TEXT_LIMIT = 2_000;
const OBJECT_ENTRY_LIMIT = 25;
const ARRAY_ENTRY_LIMIT = 25;
const STRING_LIMIT = 500;

let cachedEnabled: boolean | null = null;
let cachedEnabledExpiresAt = 0;

type SiteDevLogInput = {
  requestId?: string;
  source: SiteDevLogSource;
  method?: string;
  path: string;
  statusCode?: number;
  outcome?: string;
  durationMs?: number;
  summary?: string;
  details?: Record<string, unknown>;
};

type DevLogPageInput = {
  limit?: number;
  offset?: number;
  source?: SiteDevLogSource;
};

type RequestLogMeta = {
  source: SiteDevLogSource;
  name?: string;
};

type WrappedRouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

type SiteDevLogEntryRow = {
  id: string;
  requestId: string | null;
  source: string;
  method: string | null;
  path: string;
  statusCode: number | null;
  outcome: string | null;
  durationMs: number | null;
  summary: string | null;
  details: Prisma.JsonValue | null;
  createdAt: Date;
};

function readSiteDevLoggingStatusFromEnv(): boolean {
  const status =
    process.env.SITE_DEV_LOGGING_STATUS ??
    process.env.siteDevLoggingStatus;

  return status === 'active';
}

export async function getSiteDevLogSetting(): Promise<SiteDevLogSetting> {
  return { enabled: readSiteDevLoggingStatusFromEnv() };
}

export async function isSiteDevLoggingEnabled(): Promise<boolean> {
  if (cachedEnabled !== null && cachedEnabledExpiresAt > Date.now()) {
    return cachedEnabled;
  }

  cachedEnabled = readSiteDevLoggingStatusFromEnv();
  cachedEnabledExpiresAt = Date.now() + SETTINGS_CACHE_TTL_MS;
  return cachedEnabled;
}

export async function createSiteDevLog(input: SiteDevLogInput): Promise<void> {
  const enabled = await isSiteDevLoggingEnabled();
  if (!enabled) return;

  try {
    const detailsValue = input.details
      ? Prisma.sql`${JSON.stringify(input.details)}::jsonb`
      : Prisma.sql`NULL`;

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "site_dev_log_entries" (
          "id",
          "requestId",
          "source",
          "method",
          "path",
          "statusCode",
          "outcome",
          "durationMs",
          "summary",
          "details"
        )
        VALUES (
          ${randomUUID()},
          ${input.requestId ?? null},
          ${input.source},
          ${input.method ?? null},
          ${input.path},
          ${input.statusCode ?? null},
          ${input.outcome ?? null},
          ${input.durationMs ?? null},
          ${input.summary ?? null},
          ${detailsValue}
        )
      `,
    );
  } catch (error) {
    console.error('Failed to create site dev log entry.', error);
  }
}

export async function getSiteDevLogs({
  limit = 20,
  offset = 0,
  source,
}: DevLogPageInput = {}): Promise<{ logs: SiteDevLogEntry[]; totalCount: number }> {
  const sourceFilter = source
    ? Prisma.sql`WHERE "source" = ${source}`
    : Prisma.empty;

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "site_dev_log_entries"
      ${sourceFilter}
    `),
    prisma.$queryRaw<SiteDevLogEntryRow[]>(Prisma.sql`
      SELECT
        "id",
        "requestId",
        "source",
        "method",
        "path",
        "statusCode",
        "outcome",
        "durationMs",
        "summary",
        "details",
        "createdAt"
      FROM "site_dev_log_entries"
      ${sourceFilter}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `),
  ]);
  const totalCount = countRows[0]?.count ?? BigInt(0);

  return {
    totalCount: Number(totalCount),
    logs: rows.map((row) => ({
      id: row.id,
      requestId: row.requestId ?? undefined,
      source: row.source as SiteDevLogSource,
      method: row.method ?? undefined,
      path: row.path,
      statusCode: row.statusCode ?? undefined,
      outcome: row.outcome ?? undefined,
      durationMs: row.durationMs ?? undefined,
      summary: row.summary ?? undefined,
      details: (row.details as Record<string, any> | null) ?? undefined,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getSiteDevLogSummary(): Promise<{
  enabled: boolean;
  totalLogs: number;
  apiLogs: number;
  webhookLogs: number;
  recentErrors: number;
}> {
  const [enabled, totalLogs, apiLogs, webhookLogs, recentErrors] = await Promise.all([
    isSiteDevLoggingEnabled(),
    getSiteDevLogCount(),
    getSiteDevLogCount('api'),
    getSiteDevLogCount('webhook'),
    prisma.problem.count(),
  ]);

  return { enabled, totalLogs, apiLogs, webhookLogs, recentErrors };
}

export async function clearSiteDevLogs(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "site_dev_log_entries"`;
}

export function withRequestDevLog<TContext extends WrappedRouteContext = WrappedRouteContext>(
  meta: RequestLogMeta,
  handler: (req: NextRequest, context: TContext) => Promise<Response>,
) {
  return async (req: NextRequest, context: TContext): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = randomUUID();
    const requestSnapshot = await getRequestSnapshot(req);

    try {
      const response = await handler(req, context);
      const responseSnapshot = await getResponseSnapshot(response);

      await createSiteDevLog({
        requestId,
        source: meta.source,
        method: req.method,
        path: req.nextUrl.pathname,
        statusCode: response.status,
        outcome: inferOutcome(response.status),
        durationMs: Date.now() - startedAt,
        summary: meta.name ?? `${req.method} ${req.nextUrl.pathname}`,
        details: compactObject({
          request: requestSnapshot,
          response: responseSnapshot,
        }),
      });

      return response;
    } catch (error) {
      await createSiteDevLog({
        requestId,
        source: meta.source,
        method: req.method,
        path: req.nextUrl.pathname,
        statusCode: 500,
        outcome: 'handler_error',
        durationMs: Date.now() - startedAt,
        summary: meta.name ?? `${req.method} ${req.nextUrl.pathname}`,
        details: compactObject({
          request: requestSnapshot,
          error: serializeError(error),
        }),
      });

      throw error;
    }
  };
}

async function getSiteDevLogCount(source?: SiteDevLogSource): Promise<number> {
  const filter = source
    ? Prisma.sql`WHERE "source" = ${source}`
    : Prisma.empty;
  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM "site_dev_log_entries"
    ${filter}
  `);

  return Number(row?.count ?? BigInt(0));
}

async function getRequestSnapshot(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type');

  return compactObject({
    url: req.nextUrl.pathname + req.nextUrl.search,
    query: Object.fromEntries(req.nextUrl.searchParams.entries()),
    headers: getSafeHeaders(req),
    body: await readRequestBody(req, contentType),
  });
}

async function getResponseSnapshot(response: Response): Promise<Record<string, unknown>> {
  const cloned = response.clone();
  const contentType = cloned.headers.get('content-type');
  const text = await cloned.text().catch(() => '');

  return compactObject({
    status: response.status,
    contentType,
    location: response.headers.get('location') ?? undefined,
    body: parseBodyContent(text, contentType),
  });
}

async function readRequestBody(req: NextRequest, contentType: string | null): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;

  try {
    const text = await req.clone().text();
    return parseBodyContent(text, contentType);
  } catch {
    return { unavailable: true };
  }
}

function parseBodyContent(text: string, contentType: string | null): unknown {
  if (!text) return undefined;

  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (contentType?.includes('application/json')) {
    try {
      return compactObject(JSON.parse(trimmed));
    } catch {
      return truncateString(trimmed, BODY_TEXT_LIMIT);
    }
  }

  return truncateString(trimmed, BODY_TEXT_LIMIT);
}

function getSafeHeaders(req: NextRequest): Record<string, string> {
  const allowedHeaders = [
    'content-type',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
    'x-requested-with',
    'x-bridge-encryption',
    'x-bridge-signature-alg',
  ];

  return Object.fromEntries(
    allowedHeaders
      .map((key) => [key, req.headers.get(key)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function inferOutcome(statusCode: number): string {
  if (statusCode >= 500) return 'server_error';
  if (statusCode >= 400) return 'client_error';
  if (statusCode >= 300) return 'redirect';
  return 'success';
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return compactObject({
      message: error.message,
      stack: truncateString(error.stack ?? '', BODY_TEXT_LIMIT),
      name: error.name,
    });
  }

  return { message: String(error) };
}

function compactObject(value: unknown): any {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string') return truncateString(value, STRING_LIMIT);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, ARRAY_ENTRY_LIMIT).map((item) => compactObject(item));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, OBJECT_ENTRY_LIMIT)
      .map(([key, nestedValue]) => [key, compactObject(nestedValue)])
      .filter((entry) => entry[1] !== undefined);

    return Object.fromEntries(entries);
  }

  return String(value);
}

function truncateString(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}
