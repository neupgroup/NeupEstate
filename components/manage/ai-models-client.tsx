

"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/core/hooks/use-toast';
import { createModelAction, updateModelAction, deleteModelAction, setDefaultModelAction } from '@/app/actions';
import type { AIModel, CreateAIModelFormValues, UpdateAIModelFormValues } from '@/types';
import { CreateAIModelSchema, UpdateAIModelSchema } from '@/types';
import { Bot, Info, PlusCircle, Trash2, Loader2, Pencil, Star, ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

function ModelForm({
    mode,
    initialData,
    onSubmit,
    isPending,
    onClose
}: {
    mode: 'create' | 'edit';
    initialData?: CreateAIModelFormValues | UpdateAIModelFormValues;
    onSubmit: (values: CreateAIModelFormValues | UpdateAIModelFormValues) => void;
    isPending: boolean;
    onClose: () => void;
}) {
    const form = useForm<CreateAIModelFormValues | UpdateAIModelFormValues>({
        resolver: zodResolver(mode === 'create' ? CreateAIModelSchema : UpdateAIModelSchema),
        defaultValues: initialData || {
            modelId: '',
            name: '',
            description: '',
            costPerMillionInputTokens: 0,
            costPerMillionOutputTokens: 0,
            isDefault: false,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="modelId" render={({ field }) => (
                    <FormItem><FormLabel>Model ID (e.g., gemini-2.5-flash)</FormLabel><FormControl><Input placeholder="gemini-2.5-flash" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Gemini 2.5 Flash" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief description of the model..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="costPerMillionInputTokens" render={({ field }) => (
                        <FormItem><FormLabel>Cost/Million Input Tokens ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="costPerMillionOutputTokens" render={({ field }) => (
                        <FormItem><FormLabel>Cost/Million Output Tokens ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Set as Default</FormLabel>
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
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'create' ? 'Create Model' : 'Save Changes')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function AIModelsClient({ initialModels }: { initialModels: AIModel[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedModel(null);
    };

    const handleEdit = (model: AIModel) => {
        setDialogMode('edit');
        setSelectedModel(model);
    };

    const handleCloseDialog = () => {
        setDialogMode(null);
        setSelectedModel(null);
    };

    const handleSubmit = (values: CreateAIModelFormValues | UpdateAIModelFormValues) => {
        startTransition(async () => {
            const action = dialogMode === 'create' ? createModelAction(values as CreateAIModelFormValues) : updateModelAction(values as UpdateAIModelFormValues);
            const result = await action;

            if (result.success) {
                toast({ title: `Model ${dialogMode === 'create' ? 'Created' : 'Updated'}` });
                handleCloseDialog();
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: `Error ${dialogMode === 'create' ? 'creating' : 'updating'} model`, description: result.error });
            }
        });
    };
    
    const handleDelete = (modelId: string) => {
        startTransition(async () => {
            const result = await deleteModelAction(modelId);
            if(result.success) {
                toast({ title: "Model Deleted" });
                router.refresh();
            } else {
                 toast({ variant: 'destructive', title: 'Error deleting model', description: result.error });
            }
        });
    }

    const handleSetDefault = (modelId: string) => {
        startTransition(async () => {
            const result = await setDefaultModelAction(modelId);
             if (result.success) {
                toast({ title: "Default Model Updated" });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Error setting default', description: result.error });
            }
        });
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Dialog open={!!dialogMode} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogMode === 'create' ? 'Create New AI Model' : 'Edit AI Model'}</DialogTitle>
                        <DialogDescription>
                            Define an AI model available for use in prompts. The ID should match the official model ID from the provider.
                        </DialogDescription>
                    </DialogHeader>
                    <ModelForm 
                        mode={dialogMode || 'create'}
                        isPending={isPending}
                        onSubmit={handleSubmit}
                        onClose={handleCloseDialog}
                        initialData={selectedModel ? { ...selectedModel, id: selectedModel.id } : undefined}
                    />
                </DialogContent>
            </Dialog>

            <div className="flex flex-row items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold leading-none tracking-tight">AI Model Management</h2>
                    <p className="text-sm text-muted-foreground">Manage AI models available for prompts.</p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Model
                </Button>
            </div>
            
            <div>
                {initialModels.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Model</TableHead>
                                <TableHead>Cost (Input/Output per 1M tokens)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialModels.map(model => (
                                <TableRow key={model.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{model.name}</p>
                                            {model.isDefault && <Badge variant="secondary"><Star className="h-3 w-3 mr-1"/>Default</Badge>}
                                        </div>
                                        <p className="font-mono text-xs text-muted-foreground">{model.modelId}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">${model.costPerMillionInputTokens.toFixed(2)} / ${model.costPerMillionOutputTokens.toFixed(2)}</p>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleSetDefault(model.id)} disabled={model.isDefault || isPending}>
                                            <ShieldCheck className="h-4 w-4"/>
                                            <span className="sr-only">Set as default</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}><Pencil className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this model configuration.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(model.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
                        <Bot className="h-4 w-4" />
                        <AlertTitle>No Models Configured</AlertTitle>
                        <AlertDescription>Create your first AI model entry by clicking the button above.</AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
