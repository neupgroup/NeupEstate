import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';

export default function EditPromptPage() {
    return (
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>AI Prompt Configuration</CardTitle>
                    <CardDescription>AI prompts are maintained alongside their flows in the codebase.</CardDescription>
                </CardHeader>
                <CardContent>
                    This prompt is no longer stored in a database. Edit its default prompt in the corresponding service under services/intelligence.
                </CardContent>
            </Card>
        </div>
    );
}
