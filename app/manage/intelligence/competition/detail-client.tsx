'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Map, Link2, FileText, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { addCompetitorSourceAction, deleteCompetitorSourceAction, saveCrawledCompetitorPropertyAction } from './actions';
import type { Competitor } from './types';
import { useToast } from '@/hooks/use-toast';

type SourceType = 'sitemap' | 'link' | 'manual';

const SOURCE_LABELS: Record<SourceType, string> = {
  sitemap: 'Sitemap',
  link: 'Link',
  manual: 'Manual',
};

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  sitemap: <Map className="h-4 w-4 text-muted-foreground shrink-0" />,
  link: <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />,
  manual: <FileText className="h-4 w-4 text-muted-foreground shrink-0" />,
};

const BASE_PATH = '/estate';

export function CompetitionDetailClient({
  competitor,
  initialPropertyUrls,
}: {
  competitor: Competitor;
  initialPropertyUrls: string[];
}) {
  const [currentCompetitor, setCurrentCompetitor] = useState(competitor);
  const [isPending, startTransition] = useTransition();
  const [sourceType, setSourceType] = useState<SourceType>('sitemap');
  const [sourceValue, setSourceValue] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStats, setCrawlStats] = useState<{ crawledCount: number; discoveredCount: number; savedCount: number } | null>(null);
  const [crawlMessage, setCrawlMessage] = useState('');
  const { toast } = useToast();

  function handleAddSource() {
    const value = sourceValue.trim();
    if (!value) return;

    startTransition(async () => {
      const res = await addCompetitorSourceAction(currentCompetitor.id, sourceType, value);
      if (res.success) {
        setSourceValue('');
        window.location.reload();
      }
    });
  }

  function handleDeleteSource(sourceId: string) {
    startTransition(async () => {
      const res = await deleteCompetitorSourceAction(sourceId, currentCompetitor.id);
      if (res.success) {
        setCurrentCompetitor((prev) => ({
          ...prev,
          sources: prev.sources.filter((source) => source.id !== sourceId),
        }));
      }
    });
  }

  async function fetchSourceUrls(source: { type: SourceType; value: string }) {
    const endpoint = source.type === 'sitemap' ? '/api/crawl/sitemap' : '/api/crawl/links';
    const response = await fetch(`${BASE_PATH}${endpoint}?url=${encodeURIComponent(source.value)}`);
    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || 'Failed to crawl source.' };
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to crawl source.');
    }

    return source.type === 'sitemap' ? (data.urls as string[]) : (data.links as string[]);
  }

  function handleCrawlSources() {
    const knownUrls = new Set(initialPropertyUrls);

    setIsCrawling(true);
    setCrawlMessage('Starting crawl...');
    setCrawlStats({ crawledCount: 0, discoveredCount: 0, savedCount: 0 });

    startTransition(async () => {
      let crawledCount = 0;
      let discoveredCount = 0;
      let savedCount = 0;

      try {
        for (const source of currentCompetitor.sources) {
          if (source.type === 'manual') continue;

          setCrawlMessage(`Crawling ${source.value}`);
          const urls = await fetchSourceUrls(source as { type: SourceType; value: string });

          for (const url of urls) {
            crawledCount += 1;
            setCrawlStats({ crawledCount, discoveredCount, savedCount });
            setCrawlMessage(`Crawled ${crawledCount} pages, discovered ${discoveredCount} new pages`);

            if (knownUrls.has(url)) {
              continue;
            }

            discoveredCount += 1;
            setCrawlStats({ crawledCount, discoveredCount, savedCount });
            setCrawlMessage(`Crawled ${crawledCount} pages, discovered ${discoveredCount} new pages`);

            const saveResult = await saveCrawledCompetitorPropertyAction(currentCompetitor.id, url);
            if (saveResult.success) {
              savedCount += 1;
              knownUrls.add(url);
              setCrawlStats({ crawledCount, discoveredCount, savedCount });
            } else {
              toast({
                variant: 'destructive',
                title: 'Save failed',
                description: saveResult.error || `Could not save ${url}`,
              });
            }
          }
        }

        toast({
          title: 'Crawl complete',
          description: `Crawled ${crawledCount} pages, discovered ${discoveredCount} new pages.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Crawl failed',
          description: error instanceof Error ? error.message : 'Failed to crawl sources.',
        });
      } finally {
        setIsCrawling(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <ClientLink href="/manage/intelligence/competition" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <span>Back to Competition</span>
      </ClientLink>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {currentCompetitor.name}
          </h2>
          {currentCompetitor.description && (
            <p className="text-sm text-muted-foreground mt-1">{currentCompetitor.description}</p>
          )}
        </div>
        <Badge variant="secondary">{currentCompetitor.sources.length} sources</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter the URL or field"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
            />
            <p className="text-xs text-muted-foreground">
              Paste a sitemap URL, listing page URL, or a manual value first.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Select source type</p>
            <div className="flex flex-wrap gap-2">
              {(['sitemap', 'link', 'manual'] as SourceType[]).map((type) => {
                const selected = sourceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSourceType(type)}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {selected ? <Check className="h-3.5 w-3.5" /> : SOURCE_ICONS[type]}
                      <span>{SOURCE_LABELS[type]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleAddSource} disabled={isPending || !sourceValue.trim()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Add Source
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Crawl Sources</CardTitle>
          <Button onClick={handleCrawlSources} disabled={isPending || isCrawling || currentCompetitor.sources.length === 0}>
            {isCrawling ? 'Crawling...' : 'Crawl Sources'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isCrawling ? (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full animate-pulse rounded-full bg-primary/70" />
              </div>
              <p className="text-sm text-muted-foreground">{crawlMessage || 'Crawling sources...'}</p>
            </div>
          ) : crawlStats ? (
            <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm">
              <span className="font-medium text-foreground">Crawled {crawlStats.crawledCount} pages</span>
              <span className="text-muted-foreground">, discovered {crawlStats.discoveredCount} new pages</span>
              {crawlStats.savedCount > 0 && (
                <span className="text-muted-foreground">, saved {crawlStats.savedCount}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run a crawl to pull in all pages from the configured sources.</p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border divide-y overflow-hidden">
        {currentCompetitor.sources.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No sources added yet.</div>
        ) : (
          currentCompetitor.sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted/5">
              <div className="flex min-w-0 items-center gap-3">
                {SOURCE_ICONS[source.type as SourceType]}
                <Badge variant="outline" className="shrink-0 capitalize">{SOURCE_LABELS[source.type as SourceType]}</Badge>
                <span className="truncate text-sm text-muted-foreground">{source.value}</span>
              </div>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleDeleteSource(source.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
