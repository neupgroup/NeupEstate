import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';

export default function AiConfigurationPage() {
    return (
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>AI Prompt Configuration</CardTitle>
                    <CardDescription>AI prompts are maintained alongside their flows in the codebase.</CardDescription>
                </CardHeader>
                <CardContent>
                    To change a prompt, edit the corresponding default prompt in its service under services/intelligence.
                </CardContent>
            </Card>
        </div>
    );
}
