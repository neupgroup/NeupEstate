
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { MortgageRequestForm } from '@/components/estate';
import { GuestSigninBanner } from '@/components/layout/guest-signin-banner';
import { getAuthenticatedMeData } from '@/services/auth/me';

export default async function RequestMortgagePage() {
    const me = await getAuthenticatedMeData();
    const showGuestBanner = me?.guest === true;

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {showGuestBanner && <GuestSigninBanner variant="inline" />}
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
