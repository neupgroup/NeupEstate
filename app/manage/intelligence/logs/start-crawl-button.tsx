'use client';

import { useState } from 'react';
import { Loader2, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { crawlCompetitorSourcesAction, getCompetitorsAction } from '../competition/actions';

type CrawlProgress = {
  phase: string;
  readPages: number;
  nonListingPages: number;
  errorPages: number;
  skippedPages: number;
};

const STAGES = [
  'getting information from url',
  'getting rendered html from url',
  'getting source html from url',
  'getting images from url',
  'converting the data to listing',
  'saving the data to database',
];

export function StartCrawlButton() {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<CrawlProgress | null>(null);

  async function handleStartCrawl() {
    setIsPending(true);
    setProgress({
      phase: 'getting information from url',
      readPages: 0,
      nonListingPages: 0,
      errorPages: 0,
      skippedPages: 0,
    });

    try {
      const competitors = await getCompetitorsAction();
      const totals = { readPages: 0, nonListingPages: 0, errorPages: 0, skippedPages: 0 };

      for (const competitor of competitors) {
        setProgress((prev) => ({
          phase: 'getting information from url',
          readPages: totals.readPages,
          nonListingPages: totals.nonListingPages,
          errorPages: totals.errorPages,
          skippedPages: totals.skippedPages,
        }));

        const result = await crawlCompetitorSourcesAction(competitor.id);
        if (!result.success) {
          totals.errorPages += 1;
          setProgress({
            phase: 'getting information from url',
            readPages: totals.readPages,
            nonListingPages: totals.nonListingPages,
            errorPages: totals.errorPages,
            skippedPages: totals.skippedPages,
          });
          continue;
        }

        totals.readPages += result.crawledCount;
        totals.nonListingPages += result.discoveredCount - result.savedCount;
        totals.skippedPages += result.errors.filter((error) => error.includes('not_to_log')).length;
        totals.errorPages += result.errors.filter((error) => !error.includes('not_to_log')).length;

        setProgress({
          phase: 'saving the data to database',
          readPages: totals.readPages,
          nonListingPages: totals.nonListingPages,
          errorPages: totals.errorPages,
          skippedPages: totals.skippedPages,
        });
      }

      toast({
        title: 'Crawl complete',
        description: `Reading ${totals.readPages} pages. Got ${totals.nonListingPages} non listing pages, ${totals.errorPages} error pages, skipped ${totals.skippedPages} pages.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Start crawl failed',
        description: error instanceof Error ? error.message : 'Unable to start crawl.',
      });
    } finally {
      setIsPending(false);
      setTimeout(() => setProgress(null), 1500);
    }
  }

  const statusText = progress
    ? `${progress.phase} | reading ${progress.readPages} pages | got ${progress.nonListingPages} non listing pages | got ${progress.errorPages} error pages | skipped ${progress.skippedPages} pages`
    : 'Start crawl';

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleStartCrawl} disabled={isPending} className="shrink-0">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
        {isPending ? 'Crawling...' : 'Start crawl'}
      </Button>
      {progress && (
        <div className="w-full rounded-md border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
          <div className="mb-2 font-medium text-foreground">{statusText}</div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const active = progress.phase === stage;
              return (
                <span
                  key={stage}
                  className={[
                    'rounded-full border px-2 py-1',
                    active ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background',
                  ].join(' ')}
                >
                  {stage}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
