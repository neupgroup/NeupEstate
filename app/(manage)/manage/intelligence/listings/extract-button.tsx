'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { extractCompetitorListingAction } from './actions';
import { useToast } from '@/core/hooks/use-toast';

export function ExtractListingButton({ competitorPageId }: { competitorPageId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleExtract = () => {
    startTransition(async () => {
      const result = await extractCompetitorListingAction(competitorPageId);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Extraction failed',
          description: result.error || 'Could not extract this page.',
        });
        return;
      }

      setDone(true);
      toast({
        title: 'Listing saved',
        description: 'The page was converted into a competitor listing.',
      });
    });
  };

  return (
    <Button onClick={handleExtract} disabled={isPending || done} size="sm" variant={done ? 'secondary' : 'default'}>
      <Sparkles className="mr-2 h-4 w-4" />
      {done ? 'Saved' : isPending ? 'Extracting...' : 'Extract Listing'}
    </Button>
  );
}
