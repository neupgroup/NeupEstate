
"use client";

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Send, Loader2, MessageSquarePlus } from 'lucide-react';
import { SendTemplateDialog } from './send-template-dialog';
import type { WhatsAppTemplate } from '@/types';
import { sendMessageAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
         <Button size="icon" className="h-10 w-10" type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
        </Button>
    )
}

interface SendMessageFormProps {
    conversationId: string;
    templates: WhatsAppTemplate[];
    isNewConversation: boolean;
}

export function SendMessageForm({ conversationId, templates, isNewConversation }: SendMessageFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const handleAction = async (formData: FormData) => {
        // Clear the textarea immediately on submission
        if (formRef.current) {
            const textarea = formRef.current.querySelector('textarea');
            if(textarea) textarea.value = '';
        }
        await sendMessageAction(conversationId, formData);
        formRef.current?.reset();
    };

    if (isNewConversation) {
        return (
            <div className="p-4 flex-shrink-0 bg-background/95 rounded-b-lg">
                <Alert>
                    <MessageSquarePlus className="h-4 w-4" />
                    <AlertTitle>Start the Conversation</AlertTitle>
                    <AlertDescription>
                        You must start a new conversation by sending an approved WhatsApp template.
                    </AlertDescription>
                </Alert>
                <div className="mt-4 flex justify-center">
                    <SendTemplateDialog 
                        conversationId={conversationId} 
                        templates={templates} 
                        triggerButton={
                            <Button>
                                <MessageSquarePlus className="mr-2 h-4 w-4" />
                                Send Template
                            </Button>
                        }
                    />
                </div>
            </div>
        )
    }


    return (
        <form ref={formRef} action={handleAction} className="p-4 flex-shrink-0 bg-background/95 rounded-b-lg">
            <div className="relative">
                <Textarea placeholder="Type your message..." className="pr-24 min-h-[50px]" name="messageText" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <SendTemplateDialog conversationId={conversationId} templates={templates} />
                    <SubmitButton />
                </div>
            </div>
        </form>
    );
}
