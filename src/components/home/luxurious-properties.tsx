
import { getLuxuriousProperties } from "@/services/property-service";
import { PropertyCard } from "@/components/property-card";
import { Section } from "./_components/section";
import { SectionTitle } from "./_components/section-title";

export async function LuxuriousProperties() {
    const properties = await getLuxuriousProperties(4);
    if (properties.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/search?tier=luxurious">Luxurious Properties</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
