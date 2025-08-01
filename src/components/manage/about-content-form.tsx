
"use client";

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateAboutPageContentSchema, type UpdateAboutPageContentFormValues } from '@/types';
import { updateAboutPageContentAction } from '@/app/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { AboutPageContent } from '@/services/site-content-service';

export function AboutContentForm({ initialContent }: { initialContent: AboutPageContent }) {
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();

    const form = useForm<UpdateAboutPageContentFormValues>({
        resolver: zodResolver(UpdateAboutPageContentSchema),
        defaultValues: {
            missionStatement: initialContent.missionStatement || '',
        },
    });

    const onSubmit = (values: UpdateAboutPageContentFormValues) => {
        startSaveTransition(async () => {
            const result = await updateAboutPageContentAction(values);
            if (result.success) {
                toast({ title: 'Content Saved' });
            } else {
                toast({ variant: 'destructive', title: 'Error Saving Content', description: result.error });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="missionStatement"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mission Statement</FormLabel>
                            <FormControl>
                                <Textarea {...field} rows={6} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Content'}
                </Button>
            </form>
        </Form>
    );
}
