export type CrawlRule = string;

function normalizePath(pathname: string): string {
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

function matchesGlob(pathname: string, pattern: string): boolean {
  const normalizedPath = normalizePath(pathname);
  const normalizedPattern = normalizePath(pattern.trim());
  const prefix = normalizedPattern.replace(/\*+$/g, '');
  return normalizedPath.startsWith(prefix);
}

export function shouldIndexCrawledUrl(url: string, rules: CrawlRule[] | null | undefined): boolean {
  const activeRules = (rules ?? []).map((rule) => rule.trim()).filter(Boolean);
  if (activeRules.length === 0) return true;

  const pathname = new URL(url).pathname;
  const allowRules = activeRules.filter((rule) => !rule.startsWith('!'));
  const denyRules = activeRules.filter((rule) => rule.startsWith('!')).map((rule) => rule.slice(1));

  if (allowRules.length > 0) {
    return allowRules.some((rule) => matchesGlob(pathname, rule));
  }

  return !denyRules.some((rule) => matchesGlob(pathname, rule));
}

export function parseCrawlRules(raw: string): CrawlRule[] {
  return raw
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean);
}
