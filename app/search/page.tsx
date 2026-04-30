
import { Suspense } from "react";
import { SearchSection } from "@/components/search-section";
import { PopularCategories } from "@/components/home/popular-categories";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";
import { ClientLink } from "@/components/client-link";
import { Card, CardContent } from "@/components/ui/card";
import { SafeImage } from "@/components/safe-image";

// Mock data for featured collections
const mockFeaturedCollections = [
    { id: 'luxury-penthouses-2024', name: 'Luxury Penthouses 2024', description: 'The finest high-rise living available this year.', propertyCount: 8, coverImage: 'https://placehold.co/600x400.png', dataAiHint: 'luxury penthouse city' },
    { id: 'starter-homes', name: 'Top Starter Homes', description: 'Affordable and beautiful homes perfect for first-time buyers.', propertyCount: 12, coverImage: 'https://placehold.co/600x400.png', dataAiHint: 'suburban house' },
    { id: 'commercial-hotspots', name: 'Commercial Hotspots', description: 'Prime locations for your next business venture.', propertyCount: 15, coverImage: 'https://placehold.co/600x400.png', dataAiHint: 'modern office building' },
];


function FeaturedCollections() {
    return (
        <Section className="bg-background">
            <SectionTitle href="/collections" showMoreButton={true}>
                Featured Collections
            </SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Hand-picked collections from our team of experts.
            </p>
            <div className="space-y-4">
                {mockFeaturedCollections.map(collection => (
                    <ClientLink href={`/saved/${collection.id}`} key={collection.id}>
                        <Card className="hover:border-primary transition-colors flex items-center">
                            <CardContent className="p-4 flex items-center gap-6 w-full">
                                <SafeImage 
                                    src={collection.coverImage}
                                    data-ai-hint={collection.dataAiHint}
                                    alt={collection.name}
                                    width={128}
                                    height={128}
                                    className="h-32 w-32 object-cover rounded-lg"
                                    fallbackSrc="https://placehold.co/128x128.png"
                                />
                                <div className="flex-grow">
                                    <h3 className="text-xl font-semibold">{collection.name}</h3>
                                    <p className="text-muted-foreground text-sm mt-1">{collection.description}</p>
                                    <p className="text-sm font-medium mt-2">{collection.propertyCount} properties</p>
                                </div>
                            </CardContent>
                        </Card>
                    </ClientLink>
                ))}
            </div>
        </Section>
    );
}


export default function SearchLandingPage() {
    return (
        <main className="flex-1">
            <SearchSection />
            <Suspense fallback={null}>
                <PopularCategories />
            </Suspense>
            <Suspense fallback={null}>
                <FeaturedCollections />
            </Suspense>
        </main>
    );
}
