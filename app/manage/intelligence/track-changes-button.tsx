'use client';

import { useTransition } from 'react';
import { Loader2, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { crawlAllCompetitorSourcesAction } from './competition/actions';

export function TrackChangesButton() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleTrackChanges() {
    startTransition(async () => {
      const result = await crawlAllCompetitorSourcesAction();

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Track changes failed',
          description: result.error,
        });
        return;
      }

      toast({
        title: 'Tracking complete',
        description: `Crawled ${result.competitorsCount} competitors, scanned ${result.crawledCount} URLs, discovered ${result.discoveredCount}, and saved ${result.savedCount}.`,
      });

      if (result.errors.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some sources failed',
          description: `${result.errors.length} source errors occurred while crawling.`,
        });
      }
    });
  }

  return (
    <Button onClick={handleTrackChanges} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
      Track Changes
    </Button>
  );
}
