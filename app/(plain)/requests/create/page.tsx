

import { PropertyRequestForm } from '@/components/estate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSearch } from 'lucide-react';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';

export default async function CreateRequestPage() {
    await requirePagePermission(PERMISSIONS.public.requirementCreate);
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSearch />
                        Post a Property Request
                    </CardTitle>
                    <CardDescription>
                        Can't find what you're looking for? Let us know your requirements, and we'll find the perfect property for you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PropertyRequestForm />
                </CardContent>
            </Card>
        </main>
    );
}
