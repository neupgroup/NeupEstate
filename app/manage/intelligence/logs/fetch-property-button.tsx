'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/logica/core/hooks/use-toast';
import { extractCompetitorListingAction } from '../listings/actions';

export function FetchPropertyButton({
  competitorPageId,
  children,
}: {
  competitorPageId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleFetch() {
    startTransition(async () => {
      const result = await extractCompetitorListingAction(competitorPageId);

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Fetch failed',
          description: result.error || 'Could not fetch this page.',
        });
        return;
      }

      toast({
        title: 'Property fetched',
        description: 'The page was converted into a competitor listing.',
      });

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleFetch}
      disabled={isPending}
      className="block min-w-0 flex-1 text-left whitespace-normal break-all leading-snug hover:underline disabled:cursor-wait"
      title="Fetch property"
    >
      <span className="inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span>{children}</span>
      </span>
    </button>
  );
}
