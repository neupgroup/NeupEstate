import { getFeaturedProperties } from "@/services/property-service";
import { PropertyCard } from "@/components/property-card";
import { Section } from "./_components/section";
import { SectionTitle } from "./_components/section-title";

export async function FeaturedProperties() {
    const properties = await getFeaturedProperties(4);
    if (properties.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search?featured=true">Featured Properties</SectionTitle>
             <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Handpicked by our team, these properties represent the best of what's available in the market right now.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
