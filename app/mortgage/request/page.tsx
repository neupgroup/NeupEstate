
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { MortgageRequestForm } from '@/components/mortgage-request-form';

export default function RequestMortgagePage() {
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Banknote />
                        Request Mortgage Support
                    </CardTitle>
                    <CardDescription>
                        Fill out your details below, and one of our mortgage specialists will contact you to discuss your financing options.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MortgageRequestForm />
                </CardContent>
            </Card>
        </main>
    );
}
