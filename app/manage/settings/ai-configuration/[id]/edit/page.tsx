

import { getPromptById } from '@/services/prompt-service';
import { PromptEditForm } from '@/components/manage/prompt-edit-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { notFound } from 'next/navigation';
import { ClientLink } from '@/components/client-link';
import { buttonVariants } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModels } from '@/services/model-service';

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const prompt = await getPromptById(id);
    const models = await getModels();

    if (!prompt) {
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto">
             <ClientLink href="/manage/settings/ai-configuration" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to AI Configuration
            </ClientLink>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Prompt</CardTitle>
                    <CardDescription>
                        Modify the details for the "{prompt.name}" prompt. Changes will be reflected immediately.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PromptEditForm
                        mode="edit"
                        prompt={prompt}
                        models={models}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
