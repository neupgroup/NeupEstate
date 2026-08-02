

import { PromptEditForm } from '@/components/manage/prompt-edit-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getModels } from '@/services/model-service';

export default async function CreatePromptPage() {
    const models = await getModels();
    
    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Prompt</CardTitle>
                    <CardDescription>
                        Define a new prompt for an AI agent. The ID must be unique and in camelCase.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PromptEditForm
                        mode="create"
                        models={models}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
