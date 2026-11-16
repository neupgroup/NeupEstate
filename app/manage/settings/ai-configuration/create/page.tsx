import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';

export default function CreatePromptPage() {
    return (
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>AI Prompt Configuration</CardTitle>
                    <CardDescription>AI prompts are maintained alongside their flows in the codebase.</CardDescription>
                </CardHeader>
                <CardContent>
                    Add new prompt definitions to the relevant service under services/intelligence.
                </CardContent>
            </Card>
        </div>
    );
}
