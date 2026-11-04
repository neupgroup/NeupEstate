
import { RecommendedListings as RecommendedListingsClient } from "@/components/recommended-properties";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export function RecommendedListings() {
    return (
        <Section>
            <SectionTitle href="/collections">
                Recommended Listings
            </SectionTitle>
            <p className="text-muted-foreground mb-6 max-w-2xl">
                Based on your interests, our AI has curated a list of listings you might love.
            </p>
            <RecommendedListingsClient requirements={null} />
        </Section>
    );
}
