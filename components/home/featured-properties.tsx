import { getFeaturedListings } from "@/services/listings/list";
import { ListingCard } from "@/components/estate";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export async function FeaturedListings() {
    const listings = await getFeaturedListings(4);
    if (listings.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search?featured=true">Featured Listings</SectionTitle>
             <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Handpicked by our team, these listings represent the best of what's available in the market right now.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((property) => (
                    <ListingCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
