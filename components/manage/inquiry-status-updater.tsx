
"use client";

import { useTransition } from 'react';
import { updateInquiryStatusAction } from '@/app/actions';
import type { InquiryStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Mail, Archive, Loader2, RotateCcw } from 'lucide-react';

interface InquiryStatusUpdaterProps {
  inquiryId: string;
  currentStatus: InquiryStatus;
}

export function InquiryStatusUpdater({ inquiryId, currentStatus }: InquiryStatusUpdaterProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: InquiryStatus) => {
    startTransition(async () => {
      const result = await updateInquiryStatusAction(inquiryId, newStatus);
      if (result.success) {
        toast({ title: 'Status Updated', description: `Inquiry marked as ${newStatus}.` });
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
      }
    });
  };

  if (currentStatus === 'new') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStatusChange('replied')}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Mark as Replied
      </Button>
    );
  }

  if (currentStatus === 'replied') {
    return (
       <Button
        variant="default"
        size="sm"
        onClick={() => handleStatusChange('closed')}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Mark as Closed
      </Button>
    );
  }

  if (currentStatus === 'closed') {
    return (
        <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">
                <Archive className="mr-2 h-3 w-3" />
                Closed
            </Badge>
            <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => handleStatusChange('new')}
                disabled={isPending}
            >
                 {isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                    <RotateCcw className="mr-1 h-3 w-3" />
                )}
                Re-open
            </Button>
        </div>
    );
  }

  return null;
}
