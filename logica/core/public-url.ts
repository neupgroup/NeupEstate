type RequestLike = {
  url?: string;
  nextUrl?: { href?: string; origin?: string; protocol?: string };
  headers?: { get(name: string): string | null };
};

const DEFAULT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://neupgroup.com/estate';
const DEFAULT_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/estate';

function normalizeBasePath(basePath: string): string {
  if (!basePath) return '';
  return basePath.startsWith('/') ? basePath.replace(/\/$/, '') : `/${basePath.replace(/\/$/, '')}`;
}

function getForwardedValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.split(',')[0]?.trim() || null;
}

export function getPublicAppOrigin(request?: RequestLike): string {
  const forwardedHost = getForwardedValue(request?.headers?.get('x-forwarded-host'));
  const host = forwardedHost ?? getForwardedValue(request?.headers?.get('host'));
  const forwardedProto = getForwardedValue(request?.headers?.get('x-forwarded-proto'));
  const proto = forwardedProto ?? request?.nextUrl?.protocol?.replace(':', '') ?? (request?.url ? new URL(request.url).protocol.replace(':', '') : null) ?? 'https';

  if (host) {
    return `${proto}://${host}`;
  }

  if (request?.nextUrl?.origin && !request.nextUrl.origin.includes('localhost')) {
    return request.nextUrl.origin;
  }

  if (request?.url) {
    return new URL(request.url).origin;
  }

  return new URL(DEFAULT_PUBLIC_BASE_URL).origin;
}

export function buildPublicAppUrl(request: RequestLike | undefined, pathnameWithSearch: string): string {
  const origin = getPublicAppOrigin(request);
  const basePath = normalizeBasePath(DEFAULT_BASE_PATH);
  const suffix = pathnameWithSearch.startsWith('/') ? pathnameWithSearch : `/${pathnameWithSearch}`;
  const targetPath = suffix === basePath || suffix.startsWith(`${basePath}/`) ? suffix : `${basePath}${suffix}`;
  return new URL(targetPath, origin).toString();
}