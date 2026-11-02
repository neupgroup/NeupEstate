import { SalesRequestForm } from '@/components/estate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { ArrowDown, CheckCircle2, Globe2, Home, Landmark, MapPinned, UsersRound } from 'lucide-react';
import { SafeImage } from '@/components/safe-image';
import { prisma } from '@neup/core/database/prisma';
import { getAgentCount } from '@/services/agents/agent/service';

const ACTIVE_PROPERTY_FILTER = { isDeleted: false, status: 'ACTIVE' as const };

/** Format a conservative count using a trailing zero, with zero kept exact. */
function formatApproximateCount(count: number): string {
    if (count === 0) return '0';

    const lastDigit = count % 10;
    const reduction = lastDigit === 0 ? 10 : lastDigit === 1 ? 0 : lastDigit;
    return `${count - reduction}+`;
}

/** Load public marketplace totals used by the seller landing page. */
async function getSellingPageStats() {
    const [propertyCount, areaRecords, agentCount, ownerPropertyCount] = await Promise.all([
        prisma.property.count({ where: ACTIVE_PROPERTY_FILTER }),
        prisma.property.findMany({
            where: ACTIVE_PROPERTY_FILTER,
            distinct: ['locationText'],
            select: { locationText: true },
        }),
        getAgentCount(),
        prisma.property.count({
            where: {
                ...ACTIVE_PROPERTY_FILTER,
                representatives: { some: { role: 'propertyOwner' } },
            },
        }),
    ]);

    return { propertyCount, areaCount: areaRecords.length, agentCount, ownerPropertyCount };
}

/** Render the property seller landing page and its sales request form. */
export default async function SellPage() {
    const stats = await getSellingPageStats();
    const marketplaceStats = [
        { label: 'Properties', value: formatApproximateCount(stats.propertyCount), icon: Home },
        { label: 'Areas', value: formatApproximateCount(stats.areaCount), icon: MapPinned },
        { label: 'Agents', value: formatApproximateCount(stats.agentCount), icon: UsersRound },
        { label: 'Owner properties', value: formatApproximateCount(stats.ownerPropertyCount), icon: Landmark },
        { label: 'Apps and sites', value: '50+', icon: Globe2 },
    ];

    return (
        <main className="flex-1">
            <section className="bg-background">
                <div className="container mx-auto grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-20">
                    <div className="max-w-2xl">
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                            <Landmark className="h-4 w-4" /> Sell with the right support
                        </p>
                        <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl lg:text-6xl">Ready to sell your property?</h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                            Tell us about your property and we’ll help connect you with real estate agencies that can guide you through your sale.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <a href="#sales-request" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                                Start a sales request <ArrowDown className="h-4 w-4" />
                            </a>
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" /> No commitment required
                            </span>
                        </div>
                    </div>
                    <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[410px]">
                        <SafeImage
                            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"
                            alt="Home ready to be listed for sale"
                            fill
                            priority
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            className="object-cover"
                            fallbackSrc="https://placehold.co/1200x900.png"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                            <p className="text-sm font-medium text-white/80">Your next chapter starts here</p>
                            <p className="mt-2 text-2xl font-semibold sm:text-3xl">Connect your property with the right buyers.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="marketplace-stats-heading" className="overflow-hidden border-y border-border/60 bg-card py-12 sm:py-16">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto mb-8 max-w-2xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">A connected marketplace</p>
                        <h2 id="marketplace-stats-heading" className="mt-3 text-3xl font-headline font-bold sm:text-4xl">Put your property in front of an active network.</h2>
                    </div>
                </div>
                <div className="bank-partners-marquee mt-8" aria-label="Marketplace statistics">
                    <div className="bank-partners-track">
                        {[...Array(2)].flatMap((_, groupIndex) =>
                            marketplaceStats.map(({ label, value, icon: StatIcon }) => (
                                <Card key={`${groupIndex}-${label}`} aria-hidden={groupIndex === 1} className="w-64 shrink-0 border-border/70 bg-background text-card-foreground shadow-sm sm:w-72">
                                    <CardContent className="flex min-h-24 items-center gap-4 p-4 sm:min-h-28 sm:p-5">
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <StatIcon className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0 text-left">
                                            <p className="whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
                                            <p className="whitespace-nowrap text-sm text-muted-foreground">{label}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )),
                        )}
                    </div>
                </div>
            </section>

            <section id="sales-request" className="bg-muted/30 px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
                <Card className="mx-auto max-w-3xl bg-card text-card-foreground shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-primary" /> Create a Sales Request
                        </CardTitle>
                        <CardDescription>
                            Share a few details and we’ll connect you with agencies that can help you sell your property.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SalesRequestForm />
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
