
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createWhatsAppTemplateAction, deleteWhatsAppTemplateAction } from '@/app/actions';
import type { WhatsAppTemplate, CreateWhatsAppTemplateFormValues } from '@/types';
import { CreateWhatsAppTemplateSchema, WhatsAppTemplateCategorySchema, WhatsAppTemplateLanguageSchema } from '@/types';
import { Info, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

function CreateTemplateDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateWhatsAppTemplateFormValues>({
        resolver: zodResolver(CreateWhatsAppTemplateSchema),
        defaultValues: {
            name: '',
            category: 'UTILITY',
            language: 'en_US',
            body: '',
            isPreapproved: false,
        },
    });

    async function onSubmit(values: CreateWhatsAppTemplateFormValues) {
        startTransition(async () => {
            const result = await createWhatsAppTemplateAction(values);
            if (result.success) {
                toast({
                    title: 'Template Created',
                    description: `The template "${values.name}" has been created and is pending approval.`,
                });
                onOpenChange(false);
                form.reset();
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating template',
                    description: result.error,
                });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Message Template</DialogTitle>
                    <DialogDescription>
                        This template will be submitted to Meta for approval. Use {`{{1}}`}, {`{{2}}`} for variables.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Template Name</FormLabel>
                                <FormControl><Input placeholder="e.g., appointment_reminder" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>{WhatsAppTemplateCategorySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="language" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Language</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>{WhatsAppTemplateLanguageSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                         <FormField control={form.control} name="body" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Body</FormLabel>
                                <FormControl><Textarea placeholder="Hello {{1}}, your viewing is scheduled for {{2}}." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField
                            control={form.control}
                            name="isPreapproved"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Pre-approved on Facebook</FormLabel>
                                        <FormDescription>
                                            Enable this if the template is already approved in the Meta Business Manager.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Template'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function WhatsAppTemplatesClient({ templates }: { templates: WhatsAppTemplate[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

    const handleDeleteTemplate = (templateId: string) => {
        startDeleteTransition(async () => {
            const result = await deleteWhatsAppTemplateAction(templateId);
            if (result.success) {
                toast({ title: 'Template Deleted' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Error deleting template', description: result.error });
            }
        });
    };

    const getStatusVariant = (status: WhatsAppTemplate['status']) => {
        switch (status) {
            case 'APPROVED': return 'default';
            case 'PENDING': return 'secondary';
            case 'REJECTED': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <CreateTemplateDialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>
                           WhatsApp Message Templates
                        </CardTitle>
                        <CardDescription>{templates.length} templates found.</CardDescription>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Template
                    </Button>
                </CardHeader>
                <CardContent>
                    {templates.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell className="font-mono text-sm">
                                            {template.name}
                                            {template.isPreapproved && <Badge variant="outline" className="ml-2 border-green-500 text-green-500">Pre-approved</Badge>}
                                        </TableCell>
                                        <TableCell>{template.category}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(template.status)}>{template.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isDeleting}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete the template "{template.name}".</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>No Templates Found</AlertTitle>
                            <AlertDescription>Create your first message template to get started.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
