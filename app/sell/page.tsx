
import { SalesRequestForm } from '@/components/sales-request-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function SellPage() {
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Landmark />
                        Create a Sales Request
                    </CardTitle>
                    <CardDescription>
                        Thinking of selling? Fill out the form below to connect with top agencies who can help you get the best value for your property. No commitment required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SalesRequestForm />
                </CardContent>
            </Card>
        </main>
    );
}
