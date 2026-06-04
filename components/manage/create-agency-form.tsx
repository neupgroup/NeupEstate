
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CreateAgencySchema, type CreateAgencyFormValues } from '@/types';
import { createAgencyAction } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function CreateAgencyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateAgencyFormValues>({
        resolver: zodResolver(CreateAgencySchema),
        defaultValues: {
            name: '',
            registeredName: '',
            logoUrl: '',
            website: '',
            contactEmail: '',
            contactPhone: '',
            mainLocation: '',
            branches: '',
            contactPersonName: '',
            contactPersonRole: '',
        },
    });

    async function onSubmit(values: CreateAgencyFormValues) {
        startTransition(async () => {
            const result = await createAgencyAction(values);
            if (result.success) {
                toast({
                    title: 'Agency Created',
                    description: `The agency "${values.name}" has been successfully created.`,
                });
                router.push('/manage/agencies');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating agency',
                    description: result.error,
                });
            }
        });
    }

    return (
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Create New Agency</CardTitle>
                <CardDescription>Fill out the form below to add a new agency.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* Basic Information Section */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Skyline Properties" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="registeredName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Registered Name (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g., Skyline Properties LLC" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logo URL</FormLabel>
                                        <FormControl><Input placeholder="https://example.com/logo.png" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="website" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website URL (Optional)</FormLabel>
                                        <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>

                        {/* Contact Details Section */}
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Contact Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="contactPersonName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Person Name (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="contactPersonRole" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Person Role (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g., Lead Agent" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Email (Optional)</FormLabel>
                                        <FormControl><Input type="email" placeholder="e.g., contact@skyline.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Phone (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g., (123) 456-7890" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>

                        {/* Location Section */}
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Locations</h3>
                             <FormField control={form.control} name="mainLocation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Main Office Address (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., 123 Main St, New York, NY 10001" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="branches" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch Locations (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="Enter one branch location per line" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Agency'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
