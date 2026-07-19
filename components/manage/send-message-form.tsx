
"use client";

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { sendMessageAction } from '@/services/communications';

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
    isNewConversation: boolean;
}

export function SendMessageForm({ conversationId, isNewConversation }: SendMessageFormProps) {
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

    return (
        <form ref={formRef} action={handleAction} className="p-4 flex-shrink-0 bg-background/95 rounded-b-lg">
            <div className="relative">
                <Textarea
                    placeholder={isNewConversation ? "Start the conversation..." : "Type your message..."}
                    className="pr-14 min-h-[50px]"
                    name="messageText"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <SubmitButton />
                </div>
            </div>
        </form>
    );
}
