
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/core/hooks/use-toast';
import { createFaqAction, updateFaqAction, deleteFaqAction } from '@/app/actions';
import type { FAQ, CreateFaqFormValues } from '@/types';
import { CreateFaqSchema, FaqCategorySchema } from '@/types';
import { Info, PlusCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


function FaqForm({
    mode,
    initialData,
    onSubmit,
    isPending,
    onClose
}: {
    mode: 'create' | 'edit';
    initialData?: CreateFaqFormValues;
    onSubmit: (values: CreateFaqFormValues) => void;
    isPending: boolean;
    onClose: () => void;
}) {
     const form = useForm<CreateFaqFormValues>({
        resolver: zodResolver(CreateFaqSchema),
        defaultValues: initialData || {
            question: '',
            answer: '',
            category: 'General',
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="question" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Question</FormLabel>
                        <FormControl><Input placeholder="e.g., How do I list a property?" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="answer" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Answer</FormLabel>
                        <FormControl><Textarea placeholder="Provide a clear and concise answer." {...field} rows={5} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>{FaqCategorySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'create' ? 'Create FAQ' : 'Save Changes')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function FaqAdminClient({ initialFaqs }: { initialFaqs: Record<string, FAQ[]> }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedFaq(null);
    };

    const handleEdit = (faq: FAQ) => {
        setDialogMode('edit');
        setSelectedFaq(faq);
    };

    const handleCloseDialog = () => {
        setDialogMode(null);
        setSelectedFaq(null);
    };

    const handleSubmit = (values: CreateFaqFormValues) => {
        startTransition(async () => {
            const action = dialogMode === 'create' ? createFaqAction(values) : updateFaqAction(selectedFaq!.id, values);
            const result = await action;

            if (result.success) {
                toast({ title: `FAQ ${dialogMode === 'create' ? 'Created' : 'Updated'}` });
                handleCloseDialog();
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: `Error ${dialogMode === 'create' ? 'creating' : 'updating'} FAQ`, description: result.error });
            }
        });
    };
    
    const handleDelete = (faqId: string) => {
        startTransition(async () => {
            const result = await deleteFaqAction(faqId);
            if(result.success) {
                toast({ title: "FAQ Deleted" });
                router.refresh();
            } else {
                 toast({ variant: 'destructive', title: 'Error deleting FAQ', description: result.error });
            }
        });
    }

    const categories = Object.keys(initialFaqs).sort();
    const hasFaqs = categories.length > 0;
    
    return (
        <Card className="max-w-6xl mx-auto">
            <Dialog open={!!dialogMode} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogMode === 'create' ? 'Create New FAQ' : 'Edit FAQ'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details below. Your changes will be reflected on the public FAQ page.
                        </DialogDescription>
                    </DialogHeader>
                    <FaqForm 
                        mode={dialogMode || 'create'}
                        isPending={isPending}
                        onSubmit={handleSubmit}
                        onClose={handleCloseDialog}
                        initialData={selectedFaq ? {
                            question: selectedFaq.question,
                            answer: selectedFaq.answer,
                            category: selectedFaq.category
                        } : undefined}
                    />
                </DialogContent>
            </Dialog>

            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>
                        FAQ Management
                    </CardTitle>
                    <CardDescription>Create and manage frequently asked questions.</CardDescription>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create FAQ
                </Button>
            </CardHeader>
            <CardContent>
                {hasFaqs ? (
                    <Accordion type="multiple" className="w-full">
                        {categories.map(category => (
                            <div key={category} className="mb-4">
                                <h3 className="text-lg font-semibold mb-2">{category}</h3>
                                {initialFaqs[category].map(faq => (
                                     <AccordionItem value={faq.id} key={faq.id} className="border rounded-md px-4">
                                        <div className="flex items-center justify-between w-full">
                                            <AccordionTrigger className="flex-1 text-left hover:no-underline">{faq.question}</AccordionTrigger>
                                            <div className="flex items-center gap-2 ml-4">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)}><Pencil className="h-4 w-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete this FAQ.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(faq.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <AccordionContent className="text-muted-foreground">
                                            {faq.answer}
                                        </AccordionContent>
                                     </AccordionItem>
                                ))}
                            </div>
                        ))}
                    </Accordion>
                ) : (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No FAQs Found</AlertTitle>
                        <AlertDescription>Create your first FAQ entry by clicking the button above.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
}
