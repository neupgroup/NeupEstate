"use client";

import { useTransition } from 'react';
import { Activity, PauseCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/logica/core/utils';
import { useToast } from '@/logica/core/hooks/use-toast';
import { updateSiteDevLogsSettingAction } from '@/app/actions';

type SiteDevLogsToggleProps = {
  enabled: boolean;
};

export function SiteDevLogsToggle({ enabled }: SiteDevLogsToggleProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await updateSiteDevLogsSettingAction(checked);

      if (result.success) {
        toast({
          title: checked ? 'Dev logs enabled' : 'Dev logs disabled',
          description: checked
            ? 'API and webhook requests will now be recorded.'
            : 'Request logging has been turned off.',
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Failed to update dev logs',
        description: result.error,
      });
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="site-dev-logs"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Toggle site dev logs"
      />
      <Label
        htmlFor="site-dev-logs"
        className={cn(
          'flex items-center gap-2 font-medium',
          enabled ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {enabled ? <Activity className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
        {enabled ? 'Logging active' : 'Logging paused'}
      </Label>
    </div>
  );
}
