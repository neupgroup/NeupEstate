"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { CreateConversationSchema, type CreateConversationFormValues } from '@/types';
import { createConversationAction } from '@/app/actions';

export function NewConversationDialog() {
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
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
                setOpen(false);
                form.reset();
                router.push(`/admin/messages/${result.conversationId}`);
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    New Conversation
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start a New Conversation</DialogTitle>
                    <DialogDescription>
                        Enter the customer's details below. You will be prompted to send an approved template message to start the chat.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            </DialogContent>
        </Dialog>
    );
}
