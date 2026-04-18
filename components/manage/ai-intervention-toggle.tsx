
"use client";

import { useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { setAiInterventionAction } from '@/app/actions';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiInterventionToggleProps {
  conversationId: string;
  isActive: boolean;
}

export function AiInterventionToggle({ conversationId, isActive }: AiInterventionToggleProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await setAiInterventionAction(conversationId, checked);
      if (result.success) {
        toast({
          title: `AI Intervention ${checked ? 'Enabled' : 'Disabled'}`,
          description: `The AI will ${checked ? 'now' : 'no longer'} respond automatically.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="ai-intervention"
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Toggle AI Intervention"
      />
      <Label htmlFor="ai-intervention" className={cn("flex items-center gap-2 font-semibold", isActive ? 'text-primary' : 'text-muted-foreground')}>
        {isActive ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        {isActive ? 'AI Active' : 'Manual Mode'}
      </Label>
    </div>
  );
}
