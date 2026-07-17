"use client";

import { useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/core/hooks/use-toast';
import { clearSiteDevLogsAction } from '@/services/communications';

export function ClearSiteDevLogsButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleClear = () => {
    startTransition(async () => {
      const result = await clearSiteDevLogsAction();

      if (result.success) {
        toast({
          title: 'Dev logs cleared',
          description: 'All recorded request logs have been deleted.',
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Failed to clear dev logs',
        description: result.error,
      });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Clear Dev Logs
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all request logs?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the recorded API and webhook request history from the site dev logs page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete logs'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
