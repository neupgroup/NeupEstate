'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveClient } from '@/services/lead-service';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';

const createClientSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    source: z.string().optional(),
});

type CreateClientValues = z.infer<typeof createClientSchema>;

interface CreateClientFormProps {
    accountId: string;
}

export function CreateClientForm({ accountId }: CreateClientFormProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateClientValues>({
        resolver: zodResolver(createClientSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            source: '',
        },
    });

    function onSubmit(values: CreateClientValues) {
        setError(null);
        startTransition(async () => {
            try {
                const clientId = await saveClient({ ...values, accountId });
                router.push(`/manage/clients/${clientId}`);
            } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Failed to create client.');
            }
        });
    }

    return (
        <div className="max-w-2xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl><Input placeholder="Ramesh" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl><Input placeholder="Shrestha" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl><PhoneInput placeholder="np 98xxxxxxxx" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source</FormLabel>
                                <FormControl><Input placeholder="Referral, WhatsApp, Instagram..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Client'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.push('/manage/clients')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
