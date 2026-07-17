
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/core/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { CreateConversationSchema, type CreateConversationFormValues } from '@/types';
import { createConversationAction } from '@/services/communications';

export default function CreateConversationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateConversationFormValues>({
        resolver: zodResolver(CreateConversationSchema),
        defaultValues: {
            customerName: '',
            customerPhone: '',
            notes: '',
        },
    });

    async function onSubmit(values: CreateConversationFormValues) {
        startTransition(async () => {
            const result = await createConversationAction(values);
            if (result.success && result.conversationId) {
                toast({
                    title: 'Conversation Created',
                    description: `You can now send an initial message to ${values.customerName}.`,
                });
                form.reset();
                router.push(`/manage/messages/${result.conversationId}`);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating conversation',
                    description: result.error,
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Start a New Conversation</h2>
                <p className="text-sm text-muted-foreground">
                    Enter the customer's details below. After creating the conversation, you will be redirected to the chat page to send an approved template message.
                </p>
            </div>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer Name</FormLabel>
                                <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer Phone Number</FormLabel>
                                <FormControl><PhoneInput placeholder="us 5551234567 or np 9840000000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes / Subject</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Inquiry about property #12345" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create and Continue'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
