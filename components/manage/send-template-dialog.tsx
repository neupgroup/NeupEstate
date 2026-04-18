
"use client";

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { WhatsAppTemplate } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { sendTemplateMessageAction } from '@/app/actions';

interface SendTemplateDialogProps {
  conversationId: string;
  templates: WhatsAppTemplate[];
  triggerButton?: React.ReactNode;
}

export function SendTemplateDialog({ conversationId, templates, triggerButton }: SendTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSendTemplate = (template: WhatsAppTemplate) => {
    setActiveTemplate(template.id);
    startSendingTransition(async () => {
      const result = await sendTemplateMessageAction(conversationId, template);
      if (result.success) {
        toast({
          title: "Template Message Sent",
          description: `Template "${template.name}" was sent to the user.`,
        });
        setOpen(false);
      } else {
        toast({
            variant: 'destructive',
            title: "Failed to Send Template",
            description: result.error,
        })
      }
      setActiveTemplate(null);
    });
  };

  const approvedTemplates = templates.filter(t => t.status === 'APPROVED');
  
  const trigger = triggerButton ? (
    triggerButton
  ) : (
    <Button variant="ghost" size="icon" className="h-10 w-10">
      <MessageSquarePlus className="h-5 w-5" />
      <span className="sr-only">Send Template</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send a Message Template</DialogTitle>
          <DialogDescription>
            Choose a pre-approved WhatsApp template to send to the user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {approvedTemplates.length > 0 ? (
            approvedTemplates.map(template => (
              <div key={template.id} className="p-4 border rounded-lg flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{template.body}</p>
                </div>
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleSendTemplate(template)} 
                    disabled={isSending}
                >
                  {(isSending && activeTemplate === template.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {(isSending && activeTemplate === template.id) ? 'Sending...' : 'Send'}
                </Button>
              </div>
            ))
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Approved Templates</AlertTitle>
              <AlertDescription>
                You have no approved WhatsApp templates to send. Please create and get a template approved first.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
