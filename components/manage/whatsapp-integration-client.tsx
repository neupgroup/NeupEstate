
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/logica/core/hooks/use-toast';
import { createWhatsAppTemplateAction, deleteWhatsAppTemplateAction, updateWhatsAppConfigAction } from '@/app/actions';

import type { WhatsAppTemplate, CreateWhatsAppTemplateFormValues, WhatsAppConfig } from '@/types';
import { CreateWhatsAppTemplateSchema, WhatsAppTemplateCategorySchema, WhatsAppTemplateLanguageSchema, WhatsAppConfigSchema } from '@/types';
import { Info, PlusCircle, Trash2, Loader2, KeyRound, Phone, Hash, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { WhatsAppIcon } from '@/components/icons';

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

export function WhatsappIntegrationPageClient({ templates, initialConfig }: { templates: WhatsAppTemplate[]; initialConfig: WhatsAppConfig }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditingConfig, setIsEditingConfig] = useState(false);

    const configForm = useForm<WhatsAppConfig>({
        resolver: zodResolver(WhatsAppConfigSchema),
        defaultValues: {
            apiToken: initialConfig.apiToken || '',
            phoneNumberId: initialConfig.phoneNumberId || '',
            accountId: initialConfig.accountId || '',
            webhookVerifyToken: initialConfig.webhookVerifyToken || '',
        },
    });
    
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

    const onConfigSubmit = (values: WhatsAppConfig) => {
        startSaveTransition(async () => {
            const result = await updateWhatsAppConfigAction(values);
            if (result.success) {
                toast({ title: 'Configuration Saved' });
                setIsEditingConfig(false);
            } else {
                toast({ variant: 'destructive', title: 'Error Saving Config', description: result.error });
            }
        });
    };

    const handleCancelEdit = () => {
        configForm.reset(initialConfig);
        setIsEditingConfig(false);
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
        <div className="space-y-8">
            <CreateTemplateDialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
            <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onConfigSubmit)}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <WhatsAppIcon className="h-6 w-6 text-green-500" />
                                    WhatsApp Integration
                                </CardTitle>
                                <CardDescription>
                                    Configure your WhatsApp Business API credentials and manage message templates.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {isEditingConfig ? (
                                    <>
                                        <Button variant="outline" type="button" onClick={handleCancelEdit}>Cancel</Button>
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button type="button" onClick={() => setIsEditingConfig(true)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={configForm.control}
                                name="apiToken"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>API Token</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your API Token" disabled={!isEditingConfig} className="truncate" />
                                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-6">
                                <FormField
                                    control={configForm.control}
                                    name="phoneNumberId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number ID</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Phone Number ID" disabled={!isEditingConfig} className="truncate" />
                                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={configForm.control}
                                    name="accountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account ID</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Account ID" disabled={!isEditingConfig} className="truncate" />
                                                    <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             <FormField
                                control={configForm.control}
                                name="webhookVerifyToken"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Webhook Verify Token</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Webhook Secret Token" disabled={!isEditingConfig} className="truncate" />
                                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Enter this token in your Meta App webhook configuration.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </form>
            </Form>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Message Templates</CardTitle>
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
