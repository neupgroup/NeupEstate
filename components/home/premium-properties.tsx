
import { getPremiumListings } from "@/services/listings/list";
import { ListingCard } from "@/components/estate";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export async function PremiumListings() {
    const listings = await getPremiumListings(4);
    if (listings.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search?tier=premium">Premium Listings</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((property) => (
                    <ListingCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
