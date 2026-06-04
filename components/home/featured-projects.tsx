
import { getFeaturedProjects } from "@/services/property-service";
import { PropertyCard } from "@/components/estate";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export async function FeaturedProjects() {
    const properties = await getFeaturedProjects(4);
    if (properties.length === 0) return null;
    
    return (
        <Section>
            <SectionTitle href="/search?category=Project">Featured Projects</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        </Section>
    );
}
