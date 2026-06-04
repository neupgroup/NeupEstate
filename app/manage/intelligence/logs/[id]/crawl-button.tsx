'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { crawlCompetitorSourcesAction } from './actions';
import { useToast } from '@/logica/core/hooks/use-toast';

interface CrawlButtonProps {
  competitorId: string;
}

export function CrawlSourcesButton({ competitorId }: CrawlButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCrawlStats, setLastCrawlStats] = useState<{ discovered: number; saved: number; timestamp: Date } | null>(null);
  const { toast } = useToast();

  const handleCrawl = async () => {
    setIsLoading(true);
    try {
      const result = await crawlCompetitorSourcesAction(competitorId);
      
      if (result.success) {
        const stats = {
          discovered: result.discoveredCount || 0,
          saved: result.savedCount || 0,
          timestamp: new Date(),
        };
        setLastCrawlStats(stats);
        
        toast({
          title: 'Crawl Complete',
          description: `Discovered ${stats.discovered} URLs, saved ${stats.saved} new properties.${
            result.errors && result.errors.length > 0 ? ` Encountered ${result.errors.length} error(s).` : ''
          }`,
        });
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error) => {
            console.warn('Crawl error:', error);
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Crawl Failed',
          description: result.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to crawl sources. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleCrawl}
        disabled={isLoading}
        variant="default"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Crawling...' : 'Crawl Sources'}
      </Button>
      
      {lastCrawlStats && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>
            <strong>{lastCrawlStats.discovered}</strong> URLs crawled, <strong>{lastCrawlStats.saved}</strong> saved
          </span>
        </div>
      )}
    </div>
  );
}
