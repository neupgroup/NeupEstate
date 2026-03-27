"use client";

import { useEffect, useState } from 'react';
import { getPrompts } from '@/services/prompt-service';
import type { Prompt } from '@/services/prompt-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Pencil, Info, Bot } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PromptEditForm } from '@/components/manage/prompt-edit-form';

// A hardcoded mapping of prompt IDs to models. This can be made dynamic later.
const promptModelMapping: Record<string, string> = {
    'naturalLanguageSearchPrompt': 'gemini-2.5-flash-lite',
    'extractPropertyPrompt': 'Default Model', // Uses the default from genkit.ts
    'recommendPropertiesPrompt': 'Default Model',
    'parseAdminFilterPrompt': 'Default Model',
    'propertyApprovalPrompt': 'Default Model',
    'propertyAmendmentPrompt': 'Default Model',
    'rewritePropertyDetailsPrompt': 'Default Model',
    'extractLocationPrompt': 'Default Model',
    'whatsAppChatAgentPrompt': 'Default Model',
    'aiFollowUpPrompt': 'Default Model',
    'suggestQuestionsPrompt': 'Default Model',
};

export default function AiConfigurationPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

    useEffect(() => {
        async function loadPrompts() {
            setIsLoading(true);
            const fetchedPrompts = await getPrompts();
            fetchedPrompts.sort((a, b) => a.name.localeCompare(b.name));
            setPrompts(fetchedPrompts);
            setIsLoading(false);
        }
        loadPrompts();
    }, [isDialogOpen]); // Re-fetch when dialog closes

    const handleEditClick = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setSelectedPrompt(null);
    };
    
    return (
        <div className="space-y-8 max-w-6xl mx-auto">
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Prompt: {selectedPrompt?.name}</DialogTitle>
                        <DialogDescription>
                            Modify the prompt details below. Changes will be reflected immediately across the application.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPrompt && <PromptEditForm prompt={selectedPrompt} onFinished={handleDialogClose} />}
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>AI Prompt Management</CardTitle>
                    <CardDescription>
                        View and modify the prompts used by AI agents.
                        {!isLoading && prompts.length === 0 && " Run an AI agent (e.g., perform a search) to seed the prompts here."}
                    </CardDescription>
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
                                        <Button variant="ghost" size="icon" className="ml-4" onClick={() => handleEditClick(prompt)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-1">Prompt Text</h4>
                                                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
                                                    {prompt.promptText.trim()}
                                                </pre>
                                            </div>
                                             {prompt.placeholders && prompt.placeholders.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">Available Placeholders</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {prompt.placeholders.map(p => <code key={p} className="text-xs bg-muted px-2 py-1 rounded-md">{p}</code>)}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold text-sm mb-1">Model Used</h4>
                                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Bot className="h-4 w-4" />
                                                    <span>{promptModelMapping[prompt.id] || 'Default Model'}</span>
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
