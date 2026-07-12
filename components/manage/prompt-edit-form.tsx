

"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UpdatePromptSchema, CreatePromptSchema, type UpdatePromptFormValues, type CreatePromptFormValues, type AIModel } from '@/types';
import type { Prompt } from '@/services/prompt-service';
import { updatePromptAction, createPromptAction } from '@/app/actions';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const SYSTEM_DEFAULT_MODEL_VALUE = 'SYSTEM_DEFAULT';

interface PromptEditFormProps {
    prompt?: Prompt | null;
    mode: 'create' | 'edit';
    models: AIModel[];
}

export function PromptEditForm({ prompt, mode, models }: PromptEditFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, startSaveTransition] = useTransition();

    const form = useForm<CreatePromptFormValues | UpdatePromptFormValues>({
        resolver: zodResolver(mode === 'create' ? CreatePromptSchema : UpdatePromptSchema),
        defaultValues: mode === 'create' ? {
            id: '',
            name: '',
            description: '',
            promptText: '',
            placeholders: '',
            model: SYSTEM_DEFAULT_MODEL_VALUE,
        } : {
            id: prompt?.id || '',
            name: prompt?.name || '',
            description: prompt?.description || '',
            promptText: prompt?.promptText || '',
            placeholders: Array.isArray(prompt?.placeholders) ? prompt.placeholders.join(', ') : '',
            model: prompt?.model || SYSTEM_DEFAULT_MODEL_VALUE,
        },
    });

    async function onSubmit(values: CreatePromptFormValues | UpdatePromptFormValues) {
        startSaveTransition(async () => {
            const finalValues = { ...values };
            if (finalValues.model === SYSTEM_DEFAULT_MODEL_VALUE) {
                finalValues.model = ''; // Transform back to empty string for DB
            }
            
            const result = mode === 'create'
                ? await createPromptAction(finalValues as CreatePromptFormValues)
                : await updatePromptAction(finalValues as UpdatePromptFormValues);
                
            if (result.success) {
                toast({
                    title: `Prompt ${mode === 'create' ? 'Created' : 'Updated'}`,
                    description: `The prompt "${values.name}" has been successfully saved.`,
                });
                router.push('/manage/settings/ai-configuration');
            } else {
                toast({
                    variant: 'destructive',
                    title: `Error ${mode === 'create' ? 'creating' : 'updating'} prompt`,
                    description: result.error,
                });
            }
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                 <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Prompt ID</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., myCustomPrompt" disabled={mode === 'edit'} /></FormControl>
                        <FormDescription>A unique identifier for the prompt (camelCase). Cannot be changed after creation.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} placeholder="e.g., My Custom Prompt" /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="promptText" render={({ field }) => (
                    <FormItem><FormLabel>Prompt Text</FormLabel><FormControl><Textarea {...field} rows={10} className="font-mono text-xs" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="placeholders" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Placeholders</FormLabel>
                        <FormControl><Input {...field} placeholder="name, description" /></FormControl>
                        <FormDescription>Comma-separated list of available placeholders (without curly braces).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem>
                        <FormLabel>AI Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a model (or leave for default)" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={SYSTEM_DEFAULT_MODEL_VALUE}>Default Model</SelectItem>
                                {models.map(model => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <FormDescription>The specific AI model to use for this prompt.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (mode === 'create' ? 'Create Prompt' : 'Save Changes')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
