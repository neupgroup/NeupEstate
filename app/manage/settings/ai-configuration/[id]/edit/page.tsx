

import { getPromptById } from '@/services/intelligence/prompts';
import { PromptEditForm } from '@/components/manage/prompt-edit-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { notFound } from 'next/navigation';
import { Link } from '@neup/components/ui/link';
import { buttonVariants } from '@neup/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@neup/core/utils';
import { getModels } from '@/services/intelligence/models';

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const prompt = await getPromptById(id);
    const models = await getModels();

    if (!prompt) {
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto">
             <Link href="/manage/settings/ai-configuration" className={cn(buttonVariants({ variant: 'plain' }), 'mb-4')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to AI Configuration
            </Link>
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
