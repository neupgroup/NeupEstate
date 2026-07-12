import { Activity, PauseCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/core/utils';

type SiteDevLogsToggleProps = {
  enabled: boolean;
};

export function SiteDevLogsToggle({ enabled }: SiteDevLogsToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Label
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
