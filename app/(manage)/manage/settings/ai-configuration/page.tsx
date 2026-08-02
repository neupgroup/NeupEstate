
"use client";

import { useEffect, useState, useTransition } from 'react';
import { getPrompts } from '@/services/prompt-service';
import type { Prompt } from '@/services/prompt-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button, buttonVariants } from '@/components/ui/button';
import { Pencil, Info, Bot, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/core/hooks/use-toast';
import { deletePromptAction } from '@/services/content';
import { ClientLink } from '@/components/client-link';
import { cn } from '@/core/utils';

export default function AiConfigurationPage() {
    const { toast } = useToast();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();

    const fetchPrompts = async () => {
        setIsLoading(true);
        const fetchedPrompts = await getPrompts();
        fetchedPrompts.sort((a, b) => a.name.localeCompare(b.name));
        setPrompts(fetchedPrompts);
        setIsLoading(false);
    }

    useEffect(() => {
        fetchPrompts();
    }, []);
    
    const handleDelete = (prompt: Prompt) => {
        startDeleteTransition(async () => {
            const result = await deletePromptAction(prompt.id);
            if(result.success) {
                toast({ title: "Prompt Deleted", description: `The prompt "${prompt.name}" has been deleted.` });
                fetchPrompts();
            } else {
                toast({ variant: 'destructive', title: 'Error deleting prompt', description: result.error });
            }
        });
    }
    
    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>AI Prompt Management</CardTitle>
                        <CardDescription>
                            View and modify the prompts used by AI agents.
                            {!isLoading && prompts.length === 0 && " Run an AI agent (e.g., perform a search) to seed the prompts here."}
                        </CardDescription>
                    </div>
                     <ClientLink href="/manage/settings/ai-configuration/create" className={cn(buttonVariants())}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Prompt
                    </ClientLink>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                           {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : prompts.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-2">
                            {prompts.map((prompt) => (
                                <AccordionItem value={prompt.id} key={prompt.id} className="border rounded-md px-4">
                                    <div className="flex items-center justify-between w-full">
                                        <AccordionTrigger className="flex-1 text-left hover:no-underline py-3">
                                            <div>
                                                <p className="font-semibold">{prompt.name}</p>
                                                <p className="text-sm text-muted-foreground font-normal">{prompt.description}</p>
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center gap-1">
                                            <ClientLink href={`/manage/settings/ai-configuration/${prompt.id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                                                <Pencil className="h-4 w-4" />
                                            </ClientLink>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the prompt "{prompt.name}". This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(prompt)} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-1">Prompt Text</h4>
                                                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
                                                    {prompt.promptText.trim()}
                                                </pre>
                                            </div>
                                             {prompt.placeholders && Array.isArray(prompt.placeholders) && prompt.placeholders.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">Available Placeholders</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {prompt.placeholders.map(p => <code key={p} className="text-xs bg-muted px-2 py-1 rounded-md">{`{{${p}}}`}</code>)}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold text-sm mb-1">Model Used</h4>
                                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Bot className="h-4 w-4" />
                                                    <span className="font-mono text-xs">{prompt.model || 'Default Model'}</span>
                                                 </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>No Prompts Found in Database</AlertTitle>
                            <AlertDescription>
                                Prompts are added to the database the first time an AI flow is run. Try performing a property search or using another AI-powered feature to populate this list.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
