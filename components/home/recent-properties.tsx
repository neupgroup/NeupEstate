import { getRecentListings } from "@/services/listings/list";
import { ListingCard } from "@/components/estate";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export async function RecentListings() {
    const listings = await getRecentListings(4);
    if (listings.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search">Recent Listings</SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Check out the latest listings fresh on the market. Act fast before they're gone!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((property) => (
                    <ListingCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
