import { getRecentProperties } from "@/services/property";
import { PropertyCard } from "@/components/estate";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export async function RecentProperties() {
    const properties = await getRecentProperties(4);
    if (properties.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search">Recent Listings</SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Check out the latest properties fresh on the market. Act fast before they're gone!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
