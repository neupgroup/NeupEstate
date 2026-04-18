
import { RecommendedProperties as RecommendedPropertiesClient } from "@/components/recommended-properties";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export function RecommendedProperties() {
    return (
        <Section>
            <SectionTitle href="/collections">
                Recommended Properties
            </SectionTitle>
            <p className="text-muted-foreground mb-6 max-w-2xl">
                Based on your interests, our AI has curated a list of properties you might love.
            </p>
            <RecommendedPropertiesClient />
        </Section>
    );
}
