
"use client";

import { useTransition } from 'react';
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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { sendAiFollowUpAction } from '@/app/actions';

interface AiFollowUpButtonProps {
    conversationId: string;
    lastMessageSender: 'agent' | 'customer';
    isNewConversation: boolean;
}

export function AiFollowUpButton({ conversationId, lastMessageSender, isNewConversation }: AiFollowUpButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleFollowUp = () => {
        startTransition(async () => {
            toast({
                title: "AI is thinking...",
                description: "Generating and sending follow-up messages.",
            });
            const result = await sendAiFollowUpAction(conversationId);
            if (result.success) {
                toast({
                    title: "Follow-up Sent",
                    description: `The AI sent ${result.messagesSent} follow-up messages.`,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: "Follow-up Failed",
                    description: result.error,
                });
            }
        });
    };

    const isDisabled = isPending || lastMessageSender === 'customer' || isNewConversation;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isDisabled} >
                    <Bot className="mr-2 h-4 w-4" />
                    AI Follow-up
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Start AI Follow-up?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will command the AI to analyze the chat and send 1-5 automated follow-up messages to the user. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFollowUp} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, send follow-up'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
