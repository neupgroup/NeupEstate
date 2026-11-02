
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { ArrowDown, Banknote, CheckCircle2, Landmark } from 'lucide-react';
import { MortgageRequestForm } from '@/components/estate';
import { GuestSigninBanner } from '@/components/layout/guest-signin-banner';
import { getAuthenticatedMeData } from '@/services/auth/me';
import { Link } from '@neup/components/ui/link';
import { SafeImage } from '@/components/safe-image';

const BANK_PARTNERS = [
    'Nabil Bank',
    'Siddhartha Bank',
    'NMB Bank',
    'NIMB Bank',
    'Global IME Bank',
    'NIC Asia Bank',
    'Sangrila Bank',
    'Prabhu Bank',
    'Everest Bank',
    'Standard Chartered Bank',
];

export default async function RequestMortgagePage() {
    const me = await getAuthenticatedMeData();
    const showGuestBanner = me?.guest === true;

    return (
        <main className="flex-1">
            {showGuestBanner && <GuestSigninBanner variant="inline" />}
            <section className="bg-background">
                <div className="container mx-auto grid gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
                    <div className="max-w-2xl">
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                            <Banknote className="h-4 w-4" /> Mortgage guidance for your next move
                        </p>
                        <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            Find a clearer path to financing your property.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                            Get connected with a mortgage specialist who can help you understand your options and plan the next steps toward buying a home or investment property.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Link href="#request-form" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                                Request mortgage support <ArrowDown className="h-4 w-4" />
                            </Link>
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" /> No commitment to submit a request
                            </span>
                        </div>
                    </div>
                    <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[420px]">
                        <SafeImage
                            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"
                            alt="Modern home representing a property purchase"
                            fill
                            priority
                            sizes="(min-width: 1024px) 45vw, 100vw"
                            className="object-cover"
                            fallbackSrc="https://placehold.co/1200x900.png"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                            <p className="text-sm font-medium text-white/80">A more confident next step</p>
                            <p className="mt-2 max-w-md text-2xl font-semibold leading-tight sm:text-3xl">Make your property plans feel within reach.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="bank-partners-heading" className="overflow-hidden border-y border-border/60 bg-card py-12 sm:py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Financing connections</p>
                        <h2 id="bank-partners-heading" className="mt-3 text-3xl font-headline font-bold sm:text-4xl">
                            We’re connected with over 10+ banks
                        </h2>
                        <p className="mt-3 text-muted-foreground">Explore mortgage options through our banking network with guidance from a specialist.</p>
                    </div>
                </div>
                <div className="bank-partners-marquee mt-9" aria-label="Bank partners">
                    <div className="bank-partners-track">
                        {[...Array(2)].flatMap((_, groupIndex) =>
                            BANK_PARTNERS.map((bankName) => (
                                <div
                                    key={`${groupIndex}-${bankName}`}
                                    className="flex h-20 w-48 shrink-0 items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 text-foreground shadow-sm"
                                    aria-hidden={groupIndex === 1}
                                >
                                    <Landmark className="h-6 w-6 text-primary" />
                                    <span className="text-center font-semibold">{bankName}</span>
                                </div>
                            )),
                        )}
                    </div>
                </div>
            </section>

            <section id="request-form" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
                    <div className="lg:sticky lg:top-24">
                        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Get started</p>
                        <h2 className="mt-3 text-3xl font-headline font-bold">Tell us how we can help.</h2>
                        <p className="mt-4 leading-7 text-muted-foreground">
                            Complete the request form and our team will follow up to learn more about your needs and connect you with mortgage guidance.
                        </p>
                    </div>
                    <Card className="bg-card text-card-foreground shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" /> Request Mortgage Support
                            </CardTitle>
                            <CardDescription>Share your details and a mortgage specialist will contact you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MortgageRequestForm />
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}
